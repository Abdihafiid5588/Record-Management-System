const validateRecord = (req, res, next) => {
  const { 
    fullName, 
    mothersName, 
    phone, 
    parentPhone,
    feelNo,
    baare
  } = req.body;
  
  const errors = [];

  // Required field validation
  if (!fullName || fullName.trim().length < 2) {
    errors.push('Full name must be at least 2 characters long');
  }

  // Mothers name validation (required field)
  if (!mothersName || mothersName.trim().length < 2) {
    errors.push('Mother\'s name must be at least 2 characters long');
  }

  // Phone validation (if provided)
  if (phone && phone.trim() !== '' && !/^\+?[\d\s\-\(\)]{7,}$/.test(phone)) {
    errors.push('Please provide a valid phone number');
  }

  // Parent phone validation (if provided)
  if (parentPhone && parentPhone.trim() !== '' && !/^\+?[\d\s\-\(\)]{7,}$/.test(parentPhone)) {
    errors.push('Please provide a valid parent phone number');
  }

  // Feel No validation (if provided)
  if (feelNo && feelNo.trim().length > 50) {
    errors.push('Document number (Feel No) must be 50 characters or less');
  }

  // Baare validation (if provided)
  if (baare && baare.trim().length > 100) {
    errors.push('Investigator name (Baare) must be 100 characters or less');
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
};

const validateUser = (req, res, next) => {
  const { username, email, password } = req.body;
  
  const errors = [];

  if (!username || username.trim().length < 3) {
    errors.push('Username must be at least 3 characters long');
  }

  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    errors.push('Please provide a valid email address');
  }

  if (!password || password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
};

module.exports = {
  validateRecord,
  validateUser
};