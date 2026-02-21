const bcrypt = require('bcrypt');

const saltRounds = 10;

const hashPin = async (pin) => {
    return await bcrypt.hash(pin, saltRounds);
};

const comparePin = async (pin, hashedPin) => {
    return await bcrypt.compare(pin, hashedPin);
};

module.exports = {
    hashPin,
    comparePin
};
