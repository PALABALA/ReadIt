const POCKET_ACCESS_TOKEN_NAME = 'POCKET_ACCESS_TOKEN';

const POCKET_CONSUMER_KEY_NAME = 'POCKET_CONSUMER_KEY';

const POCKET_ITEM_BASE_URL = 'https://app.getpocket.com/read';

const POCKET_ITEM_STATE = Object.freeze({
    UNREAD: 'unread',
    ARCHIVE: 'archive',
    ALL: 'all'
});

module.exports = {
    POCKET_ACCESS_TOKEN_NAME,
    POCKET_CONSUMER_KEY_NAME,
    POCKET_ITEM_BASE_URL,
    POCKET_ITEM_STATE
};
