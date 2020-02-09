// Email x saved articles (MAX_EMAIL_ITEMS) every day.

'use strict';

const AWS = require('aws-sdk');
const { getPocketItemDetails, generateEmailParams } = require('./helpers.js');

const ses = new AWS.SES();
const secretManagerClient = new AWS.SecretsManager();

const MAX_EMAIL_ITEMS = 2;

// min inclusive, max exclusive
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

module.exports.sendEmail = async event => {
	try {
		const itemDetails = await getPocketItemDetails(secretManagerClient);

		if (itemDetails.length === 0) {
			return {
				statusCode: 200,
				body: JSON.stringify({ message: 'You finished everything in your pocket!' })
			};
		}

		let emailPocketItems = [];
		if (itemDetails.length <= MAX_EMAIL_ITEMS) {
			emailPocketItems = itemDetails;
		} else {
			for (let i = 0; i < MAX_EMAIL_ITEMS; i++) {
				const index = getRandomInt(0, itemDetails.length);
				emailPocketItems.push(itemDetails[index]);
				itemDetails.splice(index, 1);
			}
		}

		const emailParams = generateEmailParams('Your Daily Pocket Reading List', emailPocketItems);

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
