// Email a list of archived articles every other week.

'use strict';

const AWS = require('aws-sdk');
const { getPocketItemDetails, generateEmailParams } = require('./helpers.js');
const { POCKET_ITEM_STATE } = require('./constants.js');

const ses = new AWS.SES();
const secretManagerClient = new AWS.SecretsManager();

module.exports.sendEmail = async event => {
	try {
		const itemDetails = await getPocketItemDetails(secretManagerClient, POCKET_ITEM_STATE.ARCHIVE);

		if (itemDetails.length === 0) {
			return {
				statusCode: 200,
				body: JSON.stringify({ message: 'No archived item available!' })
			};
        }

        const emailParams = generateEmailParams('Your Archived Pocket Articles', itemDetails);

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
