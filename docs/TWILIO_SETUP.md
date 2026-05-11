# Configuration Twilio pour CITURBAREA

## Variables d'environnement requises

```env
# Twilio — utilisé par admin-auth (login OTP SMS), admin-notify (alertes),
# et otp.service (P1/dossiers verification téléphone)
TWILIO_ACCOUNT_SID=AC...                    # Account SID (commence par AC)
TWILIO_AUTH_TOKEN=...                       # Auth Token (32 caractères hex)
TWILIO_FROM=+15551234567                    # Numéro Twilio acheté, format E.164
TWILIO_VERIFY_SID=VA...                     # Verify Service SID (optionnel mais recommandé)

# Active l'envoi SMS pour le flux P1/dossiers (admin OTP est toujours actif)
SMS_ENABLED=true
```

## Où ces vars sont utilisées

| Module | Méthodes | Mode |
|---|---|---|
| `admin-auth.service` | Étape 3 du login admin (OTP SMS) | Programmable Messaging |
| `admin-notify.service` | Alertes (login nouvelle IP, kill switch, export RGPD) | Programmable Messaging |
| `otp.service` | Vérification téléphone client (P1, dossiers) | Verify ou Programmable |

## Comment obtenir ces valeurs

1. **Compte Twilio** → https://www.twilio.com/try-twilio (trial gratuit avec $15 USD crédit)
2. **Vérifier ton numéro perso** (étape obligatoire en trial)
3. **Acheter un numéro Twilio** :
   - Console → Phone Numbers → Manage → Buy a Number
   - Cherche un numéro Morocco / France / United States avec SMS capability
   - Coût : ~$1/mois (gratuit avec crédit trial)
   - Format E.164 → `TWILIO_FROM`
4. **Récupérer Account SID + Auth Token** :
   - Console homepage → panel "Account Info"
5. **Créer Verify Service** (recommandé pour anti-fraude) :
   - Console → Explore Products → Verify → Services → Create New Service
   - Nom : `CITURBAREA Admin Verify`
   - Code length : 6, Channel : SMS
   - Service SID → `TWILIO_VERIFY_SID`
6. **Vérifier les numéros destinataires** (trial only) :
   - Console → Phone Numbers → Manage → Verified Caller IDs
   - Ajoute `+212700127892`, `+212723200036`, `+212661362476`
   - Une fois compte upgradé en payant ($20 mini), cette limite saute.

## Configurer sur Railway

```bash
railway variables --service citurb --set "TWILIO_ACCOUNT_SID=AC..."
railway variables --service citurb --set "TWILIO_AUTH_TOKEN=..."
railway variables --service citurb --set "TWILIO_FROM=+1..."
railway variables --service citurb --set "TWILIO_VERIFY_SID=VA..."
railway variables --service citurb --set "SMS_ENABLED=true"
```

## Mode dev (sans Twilio configuré)

Si une variable manque, le code log un warning et :
- Pour `sendSms()` : message non envoyé, return `{ ok: false }`. Le code OTP est loggé dans Railway logs pour debug.
- Pour `sendVerification()` : génère un code dev local, retourné dans `devCode` field.

## Coûts production estimés

- **Numéro Twilio** : ~$1.15/mois (US) ou ~$15/mois (numéro short code marocain)
- **SMS sortant France/Maroc** : ~$0.075/SMS
- **SMS sortant US** : ~$0.0079/SMS
- **Verify API** : ~$0.05/vérification (codes Twilio générés)

Pour 1000 SMS/mois → ~$76 (numéro US + SMS Maroc).

## Sécurité

- ⚠ **Ne jamais commit** `TWILIO_AUTH_TOKEN` dans git
- ⚠ Activer **Geo Permissions** dans Console pour restreindre aux pays Maroc/France/US (évite SMS pumping)
- ⚠ Activer **Fraud Guard** dans Verify Service
- ✅ TwilioService log toutes les erreurs avec détails
- ✅ Audit trail dans `AdminAuditLog` à chaque OTP demandé/vérifié
