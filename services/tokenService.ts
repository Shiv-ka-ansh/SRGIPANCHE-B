import bcrypt from 'bcryptjs';

export const generate6DigitToken = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const hashToken = async (token: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(token, salt);
};

export const verifyTokenMatch = async (token: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(token, hash);
};
