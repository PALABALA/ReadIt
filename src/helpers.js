const fetch = require ('node-fetch');

const { POCKET_ACCESS_TOKEN_NAME, POCKET_CONSUMER_KEY_NAME, POCKET_ITEM_STATE, POCKET_ITEM_BASE_URL } = require('./constants.js');

const getAWSSecret = async (secretName, secretManagerClient) => {
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

const getPocketItemDetails = async (secretManagerClient, state=POCKET_ITEM_STATE.UNREAD) => {
	try {
		const pocketConsumerKey = await getAWSSecret(POCKET_CONSUMER_KEY_NAME, secretManagerClient);
		const pocketAccessToken = await getAWSSecret(POCKET_ACCESS_TOKEN_NAME, secretManagerClient);

		const pocketData = await fetch('https://getpocket.com/v3/get', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				'charset': 'UTF8',
				'X-Accept': 'application/json'
			},
			body: JSON.stringify({
				'consumer_key': pocketConsumerKey,
				'access_token': pocketAccessToken,
				'state': state
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

function generateEmailBodyText(itemId, title, url, excerpt) {
	return `
		Title: ${title} \n
		Url: ${url} \n
		Excertp: ${excerpt}
		Pocket Page: ${POCKET_ITEM_BASE_URL}/${itemId}
	`;
}

function generateEmailBodyHtml(itemId, title, url, excerpt) {
    return `
        <a class="titleLink" href="${url}">${title}</a>
        <p class="excerpt">${excerpt}</p>
        <a class="pocketLink" href="${POCKET_ITEM_BASE_URL}/${itemId}">Go to pocket</a>
        <br />
        <br />
	`;
}

function generateEmailParams(emailTitle, emailPocketItems, sourceEmail=process.env.SOURCE_EMAIL, destinationEmail = process.env.DESTINATION_EMAIL) {
	let emailBodyText = '';
	let emailBodyHtml = '';

	for (let i = 0; i < emailPocketItems.length; i++) {
		const emailPocketItem = emailPocketItems[i];
		const resolvedTitle = emailPocketItem['resolved_title'];
		const givenTitle = emailPocketItem['given_title'];
		const resolvedUrl = emailPocketItem['resolved_url'];
		const givenUrl = emailPocketItem['given_url'];
		const itemId = emailPocketItem['item_id'];

		const title = givenTitle ? givenTitle : resolvedTitle;
		const url = resolvedUrl ? resolvedUrl : givenUrl;

		const excerpt = emailPocketItem['excerpt'];

		emailBodyText += generateEmailBodyText(itemId, title, url, excerpt);
		emailBodyHtml += generateEmailBodyHtml(itemId, title, url, excerpt);
	}

	const htmlData = `
		<html>
			<head>
                <style>
                    #wrapper {
                        margin: 0 auto;
                        max-width: 700px;
                    }
					.titleLink {
						font-size: 1.8em;
						text-decoration: underline;
						color: #006eb3;
					}
					.excerpt {
						margin: 0;
					}
					.pocketLink {
						font-size: 0.5em;
						text-decoration: underline;
						color: #006eb3;
                    }
				</style>
			</head>
            <body>
                <div id='wrapper'>
    				${emailBodyHtml}
                </div>
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
				Data: emailTitle
			}
		}
	}
}

module.exports = {
    getPocketItemDetails,
    generateEmailParams
};
