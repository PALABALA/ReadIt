'use strict';

const AWS = require('aws-sdk');
const fetch = require ('node-fetch');

const ses = new AWS.SES();
const secretManagerClient = new AWS.SecretsManager();

const pocketAccessTokenName = 'POCKET_ACCESS_TOKEN';
const pocketConsumerKeyName = 'POCKET_CONSUMER_KEY';

const sourceEmail = process.env.SOURCE_EMAIL;
const destinationEmail = process.env.DESTINATION_EMAIL;

const MAX_EMAIL_ITEMS = 2;

async function getAWSSecret(secretName) {
	try {
		const data = await secretManagerClient.getSecretValue({ SecretId: secretName }).promise();
		if ('SecretString' in data) {
			const secret = data.SecretString;
			return secret;
        } else {
            throw new Error('Cannot parse non-string keys.');
        }
	} catch (err) {
		console.error(err.message);
		throw err;
	}
}

async function getPocketItemDetails() {
	try {
		const pocketConsumerKey = await getAWSSecret(pocketConsumerKeyName);
		const pocketAccessToken = await getAWSSecret(pocketAccessTokenName);

		const pocketData = await fetch('https://getpocket.com/v3/get', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				'charset': 'UTF8',
				'X-Accept': 'application/json'
			},
			body: JSON.stringify({
				'consumer_key': pocketConsumerKey,
				'access_token': pocketAccessToken
			})
		});

		const parsedPocketData = await pocketData.json();
		const items = parsedPocketData.list;
		const itemDetails = Object.values(items);
		return itemDetails;
	} catch (err) {
		console.error(err);
		return [];
	}
}

// min inclusive, max exclusive
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

function generateEmailBodyText(title, url, excerpt) {
	return `
		Title: ${title} \n
		Url: ${url} \n
		Excertp: ${excerpt}
	`;
}

function generateEmailBodyHtml(title, url, excerpt) {
	return `
		<a href="${url}">${title}</a>
		<p>${excerpt}</p>
		<br />
	`;
}

function generateEmailParams(emailPocketItems) {
	let emailBodyText = '';
	let emailBodyHtml = '';

	for (let i = 0; i < emailPocketItems.length; i++) {
		const emailPocketItem = emailPocketItems[i];
		const resolvedTitle = emailPocketItem['resolved_title'];
		const givenTitle = emailPocketItem['given_title'];
		const resolvedUrl = emailPocketItem['resolved_url'];
		const givenUrl = emailPocketItem['given_url'];

		const title = givenTitle ? givenTitle : resolvedTitle;
		const url = resolvedUrl ? resolvedUrl : givenUrl;

		const excerpt = emailPocketItem['excerpt'];

		emailBodyText += generateEmailBodyText(title, url, excerpt);
		emailBodyHtml += generateEmailBodyHtml(title, url, excerpt);
	}

	const htmlData = `
		<html>
			<head>
				<style>
					a {
						font-size: 2em;
						text-decoration: underline;
						color: #006eb3;
					}
				</style>
			</head>
			<body>
				${emailBodyHtml}
			</body>
		</html>
	`;

	return {
		Source: sourceEmail,
		Destination: {
			ToAddresses: [destinationEmail]
		},
		Message: {
			Body: {
				Text: {
					Charset: 'UTF-8',
					Data: emailBodyText
				},
				Html: {
					Data: htmlData
				}
			},
			Subject: {
				Charset: 'UTF-8',
				Data: `Your Pocket Reading List`
			}
		}
	}
}

module.exports.sendEmail = async event => {
	try {
		const itemDetails = await getPocketItemDetails();

		if (itemDetails.length === 0) {
			return {
				statusCode: 200,
				body: JSON.stringify({ message: 'You finished everything in your pocket!' })
			};
		}

		const emailPocketItems = [];
		if (itemDetails.length <= MAX_EMAIL_ITEMS) {
			emailPocketItems = itemDetails;
		}

		for (let i = 0; i < MAX_EMAIL_ITEMS; i++) {
			const index = getRandomInt(0, itemDetails.length);
			emailPocketItems.push(itemDetails[index]);
			itemDetails.splice(index, 1);
		}

		const emailParams = generateEmailParams(emailPocketItems);

		const data = await ses.sendEmail(emailParams).promise();

		return {
			statusCode: 200,
			body: JSON.stringify(data)
		};
	} catch (err) {
		console.error(err.message);
		return {
			statusCode: 500,
			body: JSON.stringify(err.message)
		};
	}
};
