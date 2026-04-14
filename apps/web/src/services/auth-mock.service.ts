/**
 * Auth Mock Service - OTP/SMS simulation
 * Mode développement avec console logging
 */

export class AuthMockService {
  private static otpStore = new Map<string, { 
    code: string; 
    expiresAt: number;
    email: string;
    phone: string;
    password: string;
  }>();

  static async signup(email: string, password: string, phone: string) {
    // Simulation délai réseau
    await new Promise(r => setTimeout(r, 500));
    
    const userId = `user-${Date.now()}`;
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    this.otpStore.set(userId, {
      code,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
      email,
      phone,
      password,
    });
    
    // Log console pour développement
    console.log(`
╔════════════════════════════════════════╗
║  📱 CODE OTP SMS (MODE DEV)            ║
╠════════════════════════════════════════╣
║  UserId:   ${userId}
║  Code:     ${code}
║  Phone:    ${phone}
║  Email:    ${email}
║  Expire:   5 minutes
╚════════════════════════════════════════╝
    `);
    
    return { userId, message: 'Code SMS envoyé' };
  }

  static async verifySMS(userId: string, code: string) {
    await new Promise(r => setTimeout(r, 300));
    
    const stored = this.otpStore.get(userId);
    
    if (!stored) {
      throw new Error('Code expiré ou session invalide');
    }
    
    if (Date.now() > stored.expiresAt) {
      this.otpStore.delete(userId);
      throw new Error('Code expiré (5 min dépassées)');
    }
    
    if (stored.code !== code) {
      throw new Error('Code incorrect');
    }
    
    this.otpStore.delete(userId);
    
    console.log(`✅ OTP Vérifié avec succès pour ${stored.email}`);
    
    return { 
      verified: true, 
      email: stored.email,
      password: stored.password 
    };
  }

  static async resendSMS(userId: string) {
    const stored = this.otpStore.get(userId);
    if (!stored) {
      throw new Error('Session expirée');
    }
    
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    this.otpStore.set(userId, {
      ...stored,
      code,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });
    
    console.log(`📱 CODE OTP RENVOYÉ: ${code} pour ${stored.phone}`);
    
    return { message: 'Code renvoyé' };
  }

  static async sendEmailConfirmation(email: string) {
    await new Promise(r => setTimeout(r, 300));
    
    console.log(`
╔════════════════════════════════════════╗
║  📧 EMAIL CONFIRMATION (MODE DEV)      ║
╠════════════════════════════════════════╣
║  To:       ${email}
║  Subject:  Confirmez votre compte
║  Link:     [MOCK] Auto-validated
╚════════════════════════════════════════╝
    `);
    
    return { sent: true };
  }
}
