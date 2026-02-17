const validateUser = (req, res, next) => {
  const { username, firstName, telegramId } = req.body;
  const errors = [];

  if (!username || username.trim() === '') {
    errors.push('Username is required');
  }

  if (username && username.length > 32) {
    errors.push('Username must be 32 characters or less');
  }

  if (!firstName || firstName.trim() === '') {
    errors.push('First name is required');
  }

  if (!telegramId || isNaN(parseInt(telegramId))) {
    errors.push('Valid Telegram ID is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
};

const validatePackage = (req, res, next) => {
  const { username, package: packageName, count, price, date } = req.body;
  const errors = [];

  if (!username || username.trim() === '') {
    errors.push('Username is required');
  }

  if (!packageName || packageName.trim() === '') {
    errors.push('Package name is required');
  }

  if (!count || isNaN(parseInt(count)) || parseInt(count) <= 0) {
    errors.push('Valid video count is required');
  }

  if (!price) {
    errors.push('Price is required');
  }

  if (!date) {
    errors.push('Date is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
};

module.exports = {
  validateUser,
  validatePackage
};
