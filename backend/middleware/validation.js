// In your validation middleware file
const validateRecord = (req, res, next) => {
  const { 
    fullName, 
    mothersName,
    feelNo,
    baare
  } = req.body;
  
  const errors = [];

  // Required field validation
  if (!fullName || fullName.trim().length < 2) {
    errors.push('Full name must be at least 2 characters long');
  }

  // Mothers name validation
  if (!mothersName || mothersName.trim().length < 2) {
    errors.push('Mother\'s name must be at least 2 characters long');
  }

  // Feel No validation
  if (feelNo && feelNo.trim().length > 50) {
    errors.push('Document number (Feel No) must be 50 characters or less');
  }

  // Baare validation
  if (baare && baare.trim().length > 100) {
    errors.push('Investigator name (Baare) must be 100 characters or less');
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
};