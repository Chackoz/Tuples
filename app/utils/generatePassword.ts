export const generatePassword = (): string => {
  const length = 12;
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
  let password = "";
  const requirements = {
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  };

  while (password.length < length) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    const randomChar = charset[randomIndex];
    password += randomChar;

    if (!requirements.uppercase && /[A-Z]/.test(randomChar)) {
      requirements.uppercase = true;
    } else if (!requirements.lowercase && /[a-z]/.test(randomChar)) {
      requirements.lowercase = true;
    } else if (!requirements.number && /\d/.test(randomChar)) {
      requirements.number = true;
    } else if (!requirements.special && /[!@#$%^&*()_+]/.test(randomChar)) {
      requirements.special = true;
    }
  }

  if (
    !requirements.uppercase ||
    !requirements.lowercase ||
    !requirements.number ||
    !requirements.special
  ) {
    return generatePassword();
  }
  return password;
};
