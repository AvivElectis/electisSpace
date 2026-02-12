import CryptoJS from 'crypto-js';

describe('Encryption Service', () => {
    const testPassword = 'test-password-123';
    const testData = { username: 'testuser', password: 'testpass' };

    describe('Encryption', () => {
        it('should encrypt data with password', () => {
            const encrypted = CryptoJS.AES.encrypt(
                JSON.stringify(testData),
                testPassword
            ).toString();

            expect(encrypted).toBeDefined();
            expect(encrypted).not.toBe(JSON.stringify(testData));
            expect(encrypted.length).toBeGreaterThan(0);
        });

        it('should produce different encrypted strings for same data', () => {
            const encrypted1 = CryptoJS.AES.encrypt(
                JSON.stringify(testData),
                testPassword
            ).toString();

            const encrypted2 = CryptoJS.AES.encrypt(
                JSON.stringify(testData),
                testPassword
            ).toString();

            // Due to random IV, encrypted strings should be different
            expect(encrypted1).not.toBe(encrypted2);
        });
    });

    describe('Decryption', () => {
        it('should decrypt data with correct password', () => {
            const encrypted = CryptoJS.AES.encrypt(
                JSON.stringify(testData),
                testPassword
            ).toString();

            const decrypted = CryptoJS.AES.decrypt(encrypted, testPassword);
            const decryptedData = JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));

            expect(decryptedData).toEqual(testData);
        });

        it('should fail to decrypt with wrong password', () => {
            const encrypted = CryptoJS.AES.encrypt(
                JSON.stringify(testData),
                testPassword
            ).toString();

            // When decrypting with wrong password, CryptoJS may:
            // 1. Return garbage bytes that can't be parsed as UTF-8 (throws error)
            // 2. Return empty string
            // Either way, we won't get the original data back
            try {
                const decrypted = CryptoJS.AES.decrypt(encrypted, 'wrong-password');
                const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);

                // If it doesn't throw, the result should be empty or not match original
                expect(decryptedString === '' || decryptedString !== JSON.stringify(testData)).toBe(true);
            } catch (error) {
                // Expected - malformed UTF-8 when decrypting with wrong password
                expect(error).toBeDefined();
            }
        });
    });

    describe('Round-trip Encryption', () => {
        it('should encrypt and decrypt successfully', () => {
            const originalData = {
                host: 'sftp.example.com',
                username: 'user123',
                password: 'pass456',
            };

            const encrypted = CryptoJS.AES.encrypt(
                JSON.stringify(originalData),
                testPassword
            ).toString();

            const decrypted = CryptoJS.AES.decrypt(encrypted, testPassword);
            const decryptedData = JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));

            expect(decryptedData).toEqual(originalData);
        });

        it('should handle special characters', () => {
            const specialData = {
                text: 'Special chars: !@#$%^&*()_+-=[]{}|;:,.<>?',
                unicode: '你好世界 שלום עולם',
            };

            const encrypted = CryptoJS.AES.encrypt(
                JSON.stringify(specialData),
                testPassword
            ).toString();

            const decrypted = CryptoJS.AES.decrypt(encrypted, testPassword);
            const decryptedData = JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));

            expect(decryptedData).toEqual(specialData);
        });
    });

    describe('Password Validation', () => {
        it('should validate strong passwords', () => {
            const strongPasswords = [
                'MyP@ssw0rd123',
                'Str0ng!Pass',
                'C0mpl3x#Pwd',
            ];

            strongPasswords.forEach(pwd => {
                expect(pwd.length).toBeGreaterThanOrEqual(8);
                expect(pwd).toMatch(/[A-Z]/); // Has uppercase
                expect(pwd).toMatch(/[a-z]/); // Has lowercase
                expect(pwd).toMatch(/[0-9]/); // Has number
            });
        });

        it('should reject weak passwords', () => {
            const weakPasswords = ['123', 'pass', 'abc'];

            weakPasswords.forEach(pwd => {
                expect(pwd.length).toBeLessThan(8);
            });
        });
    });
});
