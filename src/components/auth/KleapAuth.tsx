"use client";

/**
 * Kleap Database — ready-made auth UI. Email/password, fully wired, BULLETPROOF.
 *
 * The primary entry point is <UserButton> in your header: it opens an in-place
 * MODAL with sign-in + sign-up (NO page navigation → works in the live preview
 * AND deployed, never a 404). Just drop it in the nav:
 *
 *   import { UserButton } from "@/components/auth/KleapAuth";
 *   <UserButton client:only="react" />
 *
 * Also available (e.g. to gate a page or build a custom screen):
 *   <AuthGate client:only="react" fallback={<SignIn/>}> ...protected... </AuthGate>
 *   const { user, isPending } = useKleapUser();
 *   <SignIn client:only="react" />  /  <SignUp client:only="react" />
 *
 * Always use client:only="react" for auth (no SSR — sessions need the browser).
 * Don't hand-roll sign-in; these handle errors, loading, the modal, and the
 * per-session token for you. (This file is protected — the platform owns it.)
 *
 * The UI text follows the SITE language automatically (PUBLIC_KLEAP_LANG stamped
 * at deploy → <html lang> → English fallback) — see the i18n block below.
 */
import * as React from "react";
import { createPortal } from "react-dom";
import { getKleapDb, isKleapDbReady } from "../../lib/kleap-db";

// 👁️ Builder-preview flag (set ONLY by the in-app preview build, never on
// deploy). When true, auth-gated content renders directly so you can SEE and
// design your gated pages in the builder instead of staring at a sign-in wall
// or a "database not configured" notice. The real gate still runs on the
// deployed site.
const IS_PREVIEW = import.meta.env.PUBLIC_KLEAP_PREVIEW === "1";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { cn } from "../../lib/utils";

// ---------------------------------------------------------------------------
// i18n — SELF-CONTAINED (no platform / next-intl dependency: this component
// ships INSIDE the user's generated site). Strings follow the site language so
// an English site never shows French buttons (and vice-versa). Same 16-language
// set as the Kleap platform. English is the base + fallback for any unknown tag.
// ---------------------------------------------------------------------------
type AuthStrings = {
  signIn: string;
  continueWithGoogle: string;
  forgotPassword: string;
  sendResetLink: string;
  resetEmailSent: string;
  newPassword: string;
  updatePassword: string;
  passwordUpdated: string;
  orSeparator: string;
  createAccount: string;
  signOut: string;
  welcomeBack: string;
  signInToContinue: string;
  quick: string;
  name: string;
  yourName: string;
  email: string;
  emailPlaceholder: string;
  password: string;
  passwordHint: string;
  yourPassword: string;
  createMyAccount: string;
  creating: string;
  signingIn: string;
  alreadyHaveAccount: string;
  noAccountYet: string;
  cantCreate: string;
  wrongCredentials: string;
  dbNotConfigured: string;
  close: string;
};

const STRINGS: Record<string, AuthStrings> = {
  en: {
    close: "Close",
    signIn: "Sign in",
    continueWithGoogle: "Continue with Google",
    forgotPassword: "Forgot password?",
    sendResetLink: "Send reset link",
    resetEmailSent:
      "If that address has an account, we just sent a link to reset the password.",
    newPassword: "New password",
    updatePassword: "Update password",
    passwordUpdated: "Password updated. You can sign in.",
    orSeparator: "or",
    createAccount: "Create account",
    signOut: "Sign out",
    welcomeBack: "Welcome back",
    signInToContinue: "Sign in to continue",
    quick: "It only takes a moment",
    name: "Name",
    yourName: "Your name",
    email: "Email",
    emailPlaceholder: "you@example.com",
    password: "Password",
    passwordHint: "At least 8 characters",
    yourPassword: "Your password",
    createMyAccount: "Create my account",
    creating: "Creating…",
    signingIn: "Signing in…",
    alreadyHaveAccount: "Already have an account?",
    noAccountYet: "Don't have an account?",
    cantCreate: "Couldn't create the account.",
    wrongCredentials: "Wrong email or password.",
    dbNotConfigured: "The database isn't set up for this app yet.",
  },
  fr: {
    close: "Fermer",
    signIn: "Se connecter",
    continueWithGoogle: "Continuer avec Google",
    forgotPassword: "Mot de passe oublié ?",
    sendResetLink: "Envoyer le lien",
    resetEmailSent:
      "Si cette adresse a un compte, nous venons d'envoyer un lien pour réinitialiser le mot de passe.",
    newPassword: "Nouveau mot de passe",
    updatePassword: "Mettre à jour",
    passwordUpdated: "Mot de passe mis à jour. Vous pouvez vous connecter.",
    orSeparator: "ou",
    createAccount: "Créer un compte",
    signOut: "Déconnexion",
    welcomeBack: "Bon retour",
    signInToContinue: "Connectez-vous pour continuer",
    quick: "C’est rapide",
    name: "Nom",
    yourName: "Votre nom",
    email: "Email",
    emailPlaceholder: "vous@exemple.com",
    password: "Mot de passe",
    passwordHint: "Au moins 8 caractères",
    yourPassword: "Votre mot de passe",
    createMyAccount: "Créer mon compte",
    creating: "Création…",
    signingIn: "Connexion…",
    alreadyHaveAccount: "Déjà un compte ?",
    noAccountYet: "Pas encore de compte ?",
    cantCreate: "Impossible de créer le compte.",
    wrongCredentials: "Email ou mot de passe incorrect.",
    dbNotConfigured:
      "La base de données n’est pas encore configurée pour cette app.",
  },
  es: {
    close: "Cerrar",
    signIn: "Iniciar sesión",
    continueWithGoogle: "Continuar con Google",
    forgotPassword: "¿Olvidaste tu contraseña?",
    sendResetLink: "Enviar enlace",
    resetEmailSent:
      "Si esa dirección tiene una cuenta, acabamos de enviar un enlace para restablecer la contraseña.",
    newPassword: "Nueva contraseña",
    updatePassword: "Actualizar",
    passwordUpdated: "Contraseña actualizada. Ya puedes iniciar sesión.",
    orSeparator: "o",
    createAccount: "Crear cuenta",
    signOut: "Cerrar sesión",
    welcomeBack: "Bienvenido de nuevo",
    signInToContinue: "Inicia sesión para continuar",
    quick: "Es rápido",
    name: "Nombre",
    yourName: "Tu nombre",
    email: "Correo electrónico",
    emailPlaceholder: "tu@ejemplo.com",
    password: "Contraseña",
    passwordHint: "Al menos 8 caracteres",
    yourPassword: "Tu contraseña",
    createMyAccount: "Crear mi cuenta",
    creating: "Creando…",
    signingIn: "Conectando…",
    alreadyHaveAccount: "¿Ya tienes una cuenta?",
    noAccountYet: "¿Aún no tienes cuenta?",
    cantCreate: "No se pudo crear la cuenta.",
    wrongCredentials: "Correo o contraseña incorrectos.",
    dbNotConfigured: "La base de datos aún no está configurada para esta app.",
  },
  de: {
    close: "Schließen",
    signIn: "Anmelden",
    continueWithGoogle: "Mit Google fortfahren",
    forgotPassword: "Passwort vergessen?",
    sendResetLink: "Link senden",
    resetEmailSent:
      "Falls zu dieser Adresse ein Konto gehört, haben wir gerade einen Link zum Zurücksetzen gesendet.",
    newPassword: "Neues Passwort",
    updatePassword: "Aktualisieren",
    passwordUpdated: "Passwort aktualisiert. Sie können sich anmelden.",
    orSeparator: "oder",
    createAccount: "Konto erstellen",
    signOut: "Abmelden",
    welcomeBack: "Willkommen zurück",
    signInToContinue: "Melde dich an, um fortzufahren",
    quick: "Geht schnell",
    name: "Name",
    yourName: "Dein Name",
    email: "E-Mail",
    emailPlaceholder: "du@beispiel.com",
    password: "Passwort",
    passwordHint: "Mindestens 8 Zeichen",
    yourPassword: "Dein Passwort",
    createMyAccount: "Mein Konto erstellen",
    creating: "Wird erstellt…",
    signingIn: "Wird angemeldet…",
    alreadyHaveAccount: "Schon ein Konto?",
    noAccountYet: "Noch kein Konto?",
    cantCreate: "Konto konnte nicht erstellt werden.",
    wrongCredentials: "E-Mail oder Passwort ist falsch.",
    dbNotConfigured: "Die Datenbank ist für diese App noch nicht eingerichtet.",
  },
  it: {
    close: "Chiudi",
    signIn: "Accedi",
    continueWithGoogle: "Continua con Google",
    forgotPassword: "Password dimenticata?",
    sendResetLink: "Invia il link",
    resetEmailSent:
      "Se a quell'indirizzo corrisponde un account, abbiamo appena inviato un link per reimpostare la password.",
    newPassword: "Nuova password",
    updatePassword: "Aggiorna",
    passwordUpdated: "Password aggiornata. Puoi accedere.",
    orSeparator: "oppure",
    createAccount: "Crea un account",
    signOut: "Esci",
    welcomeBack: "Bentornato",
    signInToContinue: "Accedi per continuare",
    quick: "È veloce",
    name: "Nome",
    yourName: "Il tuo nome",
    email: "Email",
    emailPlaceholder: "tu@esempio.com",
    password: "Password",
    passwordHint: "Almeno 8 caratteri",
    yourPassword: "La tua password",
    createMyAccount: "Crea il mio account",
    creating: "Creazione…",
    signingIn: "Accesso…",
    alreadyHaveAccount: "Hai già un account?",
    noAccountYet: "Non hai ancora un account?",
    cantCreate: "Impossibile creare l’account.",
    wrongCredentials: "Email o password non corretti.",
    dbNotConfigured: "Il database non è ancora configurato per questa app.",
  },
  pt: {
    close: "Fechar",
    signIn: "Entrar",
    continueWithGoogle: "Continuar com Google",
    forgotPassword: "Esqueceu a senha?",
    sendResetLink: "Enviar link",
    resetEmailSent:
      "Se esse endereço tiver uma conta, acabámos de enviar um link para redefinir a palavra-passe.",
    newPassword: "Nova senha",
    updatePassword: "Atualizar",
    passwordUpdated: "Senha atualizada. Já pode entrar.",
    orSeparator: "ou",
    createAccount: "Criar conta",
    signOut: "Sair",
    welcomeBack: "Bem-vindo de volta",
    signInToContinue: "Entre para continuar",
    quick: "É rápido",
    name: "Nome",
    yourName: "Seu nome",
    email: "E-mail",
    emailPlaceholder: "voce@exemplo.com",
    password: "Senha",
    passwordHint: "Pelo menos 8 caracteres",
    yourPassword: "Sua senha",
    createMyAccount: "Criar minha conta",
    creating: "Criando…",
    signingIn: "Entrando…",
    alreadyHaveAccount: "Já tem uma conta?",
    noAccountYet: "Ainda não tem conta?",
    cantCreate: "Não foi possível criar a conta.",
    wrongCredentials: "E-mail ou senha incorretos.",
    dbNotConfigured:
      "O banco de dados ainda não está configurado para este app.",
  },
  nl: {
    close: "Sluiten",
    signIn: "Inloggen",
    continueWithGoogle: "Doorgaan met Google",
    forgotPassword: "Wachtwoord vergeten?",
    sendResetLink: "Link versturen",
    resetEmailSent:
      "Als er een account bij dat adres hoort, hebben we zojuist een link gestuurd om het wachtwoord opnieuw in te stellen.",
    newPassword: "Nieuw wachtwoord",
    updatePassword: "Bijwerken",
    passwordUpdated: "Wachtwoord bijgewerkt. Je kunt inloggen.",
    orSeparator: "of",
    createAccount: "Account aanmaken",
    signOut: "Uitloggen",
    welcomeBack: "Welkom terug",
    signInToContinue: "Log in om door te gaan",
    quick: "Het is zo gebeurd",
    name: "Naam",
    yourName: "Je naam",
    email: "E-mail",
    emailPlaceholder: "jij@voorbeeld.com",
    password: "Wachtwoord",
    passwordHint: "Minstens 8 tekens",
    yourPassword: "Je wachtwoord",
    createMyAccount: "Mijn account aanmaken",
    creating: "Bezig met aanmaken…",
    signingIn: "Bezig met inloggen…",
    alreadyHaveAccount: "Heb je al een account?",
    noAccountYet: "Nog geen account?",
    cantCreate: "Kan het account niet aanmaken.",
    wrongCredentials: "Onjuist e-mailadres of wachtwoord.",
    dbNotConfigured: "De database is nog niet ingesteld voor deze app.",
  },
  ar: {
    close: "إغلاق",
    signIn: "تسجيل الدخول",
    continueWithGoogle: "المتابعة باستخدام Google",
    forgotPassword: "نسيت كلمة المرور؟",
    sendResetLink: "إرسال الرابط",
    resetEmailSent:
      "إذا كان لهذا العنوان حساب، فقد أرسلنا للتو رابطًا لإعادة تعيين كلمة المرور.",
    newPassword: "كلمة مرور جديدة",
    updatePassword: "تحديث",
    passwordUpdated: "تم تحديث كلمة المرور. يمكنك تسجيل الدخول.",
    orSeparator: "أو",
    createAccount: "إنشاء حساب",
    signOut: "تسجيل الخروج",
    welcomeBack: "مرحبًا بعودتك",
    signInToContinue: "سجّل الدخول للمتابعة",
    quick: "لن يستغرق سوى لحظة",
    name: "الاسم",
    yourName: "اسمك",
    email: "البريد الإلكتروني",
    emailPlaceholder: "you@example.com",
    password: "كلمة المرور",
    passwordHint: "8 أحرف على الأقل",
    yourPassword: "كلمة المرور الخاصة بك",
    createMyAccount: "إنشاء حسابي",
    creating: "جارٍ الإنشاء…",
    signingIn: "جارٍ تسجيل الدخول…",
    alreadyHaveAccount: "هل لديك حساب بالفعل؟",
    noAccountYet: "ليس لديك حساب بعد؟",
    cantCreate: "تعذّر إنشاء الحساب.",
    wrongCredentials: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
    dbNotConfigured: "لم يتم إعداد قاعدة البيانات لهذا التطبيق بعد.",
  },
  fa: {
    close: "بستن",
    signIn: "ورود",
    continueWithGoogle: "ادامه با Google",
    forgotPassword: "رمز عبور را فراموش کرده‌اید؟",
    sendResetLink: "ارسال لینک",
    resetEmailSent:
      "اگر این نشانی حسابی داشته باشد، همین حالا لینکی برای بازنشانی رمز عبور فرستادیم.",
    newPassword: "رمز عبور جدید",
    updatePassword: "به‌روزرسانی",
    passwordUpdated: "رمز عبور به‌روزرسانی شد. می‌توانید وارد شوید.",
    orSeparator: "یا",
    createAccount: "ایجاد حساب",
    signOut: "خروج",
    welcomeBack: "خوش آمدید",
    signInToContinue: "برای ادامه وارد شوید",
    quick: "فقط چند لحظه طول می‌کشد",
    name: "نام",
    yourName: "نام شما",
    email: "ایمیل",
    emailPlaceholder: "you@example.com",
    password: "رمز عبور",
    passwordHint: "حداقل ۸ کاراکتر",
    yourPassword: "رمز عبور شما",
    createMyAccount: "ایجاد حساب من",
    creating: "در حال ایجاد…",
    signingIn: "در حال ورود…",
    alreadyHaveAccount: "قبلاً حساب دارید؟",
    noAccountYet: "هنوز حساب ندارید؟",
    cantCreate: "ایجاد حساب ممکن نشد.",
    wrongCredentials: "ایمیل یا رمز عبور نادرست است.",
    dbNotConfigured: "پایگاه داده هنوز برای این برنامه راه‌اندازی نشده است.",
  },
  el: {
    close: "Κλείσιμο",
    signIn: "Σύνδεση",
    continueWithGoogle: "Συνέχεια με Google",
    forgotPassword: "Ξεχάσατε τον κωδικό;",
    sendResetLink: "Αποστολή συνδέσμου",
    resetEmailSent:
      "Αν αυτή η διεύθυνση έχει λογαριασμό, μόλις στείλαμε σύνδεσμο επαναφοράς κωδικού.",
    newPassword: "Νέος κωδικός",
    updatePassword: "Ενημέρωση",
    passwordUpdated: "Ο κωδικός ενημερώθηκε. Μπορείτε να συνδεθείτε.",
    orSeparator: "ή",
    createAccount: "Δημιουργία λογαριασμού",
    signOut: "Αποσύνδεση",
    welcomeBack: "Καλώς ήρθατε ξανά",
    signInToContinue: "Συνδεθείτε για να συνεχίσετε",
    quick: "Είναι γρήγορο",
    name: "Όνομα",
    yourName: "Το όνομά σας",
    email: "Email",
    emailPlaceholder: "you@example.com",
    password: "Κωδικός",
    passwordHint: "Τουλάχιστον 8 χαρακτήρες",
    yourPassword: "Ο κωδικός σας",
    createMyAccount: "Δημιουργία λογαριασμού",
    creating: "Δημιουργία…",
    signingIn: "Σύνδεση…",
    alreadyHaveAccount: "Έχετε ήδη λογαριασμό;",
    noAccountYet: "Δεν έχετε λογαριασμό;",
    cantCreate: "Δεν ήταν δυνατή η δημιουργία λογαριασμού.",
    wrongCredentials: "Λάθος email ή κωδικός.",
    dbNotConfigured:
      "Η βάση δεδομένων δεν έχει ρυθμιστεί ακόμη για αυτήν την εφαρμογή.",
  },
  id: {
    close: "Tutup",
    signIn: "Masuk",
    continueWithGoogle: "Lanjutkan dengan Google",
    forgotPassword: "Lupa kata sandi?",
    sendResetLink: "Kirim tautan",
    resetEmailSent:
      "Jika alamat itu memiliki akun, kami baru saja mengirim tautan untuk menyetel ulang kata sandi.",
    newPassword: "Kata sandi baru",
    updatePassword: "Perbarui",
    passwordUpdated: "Kata sandi diperbarui. Anda bisa masuk.",
    orSeparator: "atau",
    createAccount: "Buat akun",
    signOut: "Keluar",
    welcomeBack: "Selamat datang kembali",
    signInToContinue: "Masuk untuk melanjutkan",
    quick: "Hanya sebentar",
    name: "Nama",
    yourName: "Nama Anda",
    email: "Email",
    emailPlaceholder: "anda@contoh.com",
    password: "Kata sandi",
    passwordHint: "Minimal 8 karakter",
    yourPassword: "Kata sandi Anda",
    createMyAccount: "Buat akun saya",
    creating: "Membuat…",
    signingIn: "Masuk…",
    alreadyHaveAccount: "Sudah punya akun?",
    noAccountYet: "Belum punya akun?",
    cantCreate: "Tidak dapat membuat akun.",
    wrongCredentials: "Email atau kata sandi salah.",
    dbNotConfigured: "Basis data belum disiapkan untuk aplikasi ini.",
  },
  ja: {
    close: "閉じる",
    signIn: "ログイン",
    continueWithGoogle: "Google で続行",
    forgotPassword: "パスワードをお忘れですか？",
    sendResetLink: "リンクを送信",
    resetEmailSent:
      "そのアドレスにアカウントがあれば、パスワード再設定用のリンクを送信しました。",
    newPassword: "新しいパスワード",
    updatePassword: "更新する",
    passwordUpdated: "パスワードを更新しました。サインインできます。",
    orSeparator: "または",
    createAccount: "アカウント作成",
    signOut: "ログアウト",
    welcomeBack: "おかえりなさい",
    signInToContinue: "続けるにはログインしてください",
    quick: "すぐに完了します",
    name: "名前",
    yourName: "お名前",
    email: "メールアドレス",
    emailPlaceholder: "you@example.com",
    password: "パスワード",
    passwordHint: "8文字以上",
    yourPassword: "パスワード",
    createMyAccount: "アカウントを作成",
    creating: "作成中…",
    signingIn: "ログイン中…",
    alreadyHaveAccount: "すでにアカウントをお持ちですか？",
    noAccountYet: "アカウントをお持ちでないですか？",
    cantCreate: "アカウントを作成できませんでした。",
    wrongCredentials: "メールアドレスまたはパスワードが正しくありません。",
    dbNotConfigured: "このアプリのデータベースはまだ設定されていません。",
  },
  sq: {
    close: "Mbyll",
    signIn: "Hyr",
    continueWithGoogle: "Vazhdo me Google",
    forgotPassword: "Harruat fjalëkalimin?",
    sendResetLink: "Dërgo lidhjen",
    resetEmailSent:
      "Nëse kjo adresë ka një llogari, sapo dërguam një lidhje për të rivendosur fjalëkalimin.",
    newPassword: "Fjalëkalim i ri",
    updatePassword: "Përditëso",
    passwordUpdated: "Fjalëkalimi u përditësua. Mund të hyni.",
    orSeparator: "ose",
    createAccount: "Krijo llogari",
    signOut: "Dil",
    welcomeBack: "Mirë se erdhe sërish",
    signInToContinue: "Hyr për të vazhduar",
    quick: "Është e shpejtë",
    name: "Emri",
    yourName: "Emri yt",
    email: "Email",
    emailPlaceholder: "ti@shembull.com",
    password: "Fjalëkalimi",
    passwordHint: "Të paktën 8 karaktere",
    yourPassword: "Fjalëkalimi yt",
    createMyAccount: "Krijo llogarinë time",
    creating: "Po krijohet…",
    signingIn: "Po hyn…",
    alreadyHaveAccount: "Ke tashmë një llogari?",
    noAccountYet: "Nuk ke ende llogari?",
    cantCreate: "Llogaria nuk u krijua dot.",
    wrongCredentials: "Email ose fjalëkalim i gabuar.",
    dbNotConfigured:
      "Baza e të dhënave nuk është konfiguruar ende për këtë app.",
  },
  tr: {
    close: "Kapat",
    signIn: "Giriş yap",
    continueWithGoogle: "Google ile devam et",
    forgotPassword: "Şifrenizi mi unuttunuz?",
    sendResetLink: "Bağlantı gönder",
    resetEmailSent:
      "Bu adrese ait bir hesap varsa, şifreyi sıfırlamak için az önce bir bağlantı gönderdik.",
    newPassword: "Yeni şifre",
    updatePassword: "Güncelle",
    passwordUpdated: "Şifre güncellendi. Giriş yapabilirsiniz.",
    orSeparator: "veya",
    createAccount: "Hesap oluştur",
    signOut: "Çıkış yap",
    welcomeBack: "Tekrar hoş geldin",
    signInToContinue: "Devam etmek için giriş yap",
    quick: "Çok hızlı",
    name: "Ad",
    yourName: "Adınız",
    email: "E-posta",
    emailPlaceholder: "sen@ornek.com",
    password: "Şifre",
    passwordHint: "En az 8 karakter",
    yourPassword: "Şifreniz",
    createMyAccount: "Hesabımı oluştur",
    creating: "Oluşturuluyor…",
    signingIn: "Giriş yapılıyor…",
    alreadyHaveAccount: "Zaten hesabın var mı?",
    noAccountYet: "Henüz hesabın yok mu?",
    cantCreate: "Hesap oluşturulamadı.",
    wrongCredentials: "E-posta veya şifre hatalı.",
    dbNotConfigured: "Veritabanı bu uygulama için henüz yapılandırılmadı.",
  },
  vi: {
    close: "Đóng",
    signIn: "Đăng nhập",
    continueWithGoogle: "Tiếp tục với Google",
    forgotPassword: "Quên mật khẩu?",
    sendResetLink: "Gửi liên kết",
    resetEmailSent:
      "Nếu địa chỉ đó có tài khoản, chúng tôi vừa gửi một liên kết để đặt lại mật khẩu.",
    newPassword: "Mật khẩu mới",
    updatePassword: "Cập nhật",
    passwordUpdated: "Đã cập nhật mật khẩu. Bạn có thể đăng nhập.",
    orSeparator: "hoặc",
    createAccount: "Tạo tài khoản",
    signOut: "Đăng xuất",
    welcomeBack: "Chào mừng trở lại",
    signInToContinue: "Đăng nhập để tiếp tục",
    quick: "Rất nhanh thôi",
    name: "Tên",
    yourName: "Tên của bạn",
    email: "Email",
    emailPlaceholder: "ban@vidu.com",
    password: "Mật khẩu",
    passwordHint: "Ít nhất 8 ký tự",
    yourPassword: "Mật khẩu của bạn",
    createMyAccount: "Tạo tài khoản của tôi",
    creating: "Đang tạo…",
    signingIn: "Đang đăng nhập…",
    alreadyHaveAccount: "Đã có tài khoản?",
    noAccountYet: "Chưa có tài khoản?",
    cantCreate: "Không thể tạo tài khoản.",
    wrongCredentials: "Email hoặc mật khẩu không đúng.",
    dbNotConfigured: "Cơ sở dữ liệu chưa được thiết lập cho ứng dụng này.",
  },
  zh: {
    close: "关闭",
    signIn: "登录",
    continueWithGoogle: "使用 Google 继续",
    forgotPassword: "忘记密码？",
    sendResetLink: "发送链接",
    resetEmailSent: "如果该邮箱已注册，我们刚刚发送了重置密码的链接。",
    newPassword: "新密码",
    updatePassword: "更新",
    passwordUpdated: "密码已更新，您可以登录了。",
    orSeparator: "或",
    createAccount: "创建账户",
    signOut: "退出登录",
    welcomeBack: "欢迎回来",
    signInToContinue: "登录以继续",
    quick: "很快就好",
    name: "姓名",
    yourName: "你的姓名",
    email: "邮箱",
    emailPlaceholder: "you@example.com",
    password: "密码",
    passwordHint: "至少 8 个字符",
    yourPassword: "你的密码",
    createMyAccount: "创建我的账户",
    creating: "正在创建…",
    signingIn: "正在登录…",
    alreadyHaveAccount: "已有账户？",
    noAccountYet: "还没有账户？",
    cantCreate: "无法创建账户。",
    wrongCredentials: "邮箱或密码错误。",
    dbNotConfigured: "此应用的数据库尚未配置。",
  },
};

/** Resolve the site language ONCE (build-stamped env → <html lang> → "en"). */
function resolveAuthLang(): string {
  let raw = "";
  try {
    raw = (
      ((import.meta as any).env?.PUBLIC_KLEAP_LANG as string) || ""
    ).trim();
  } catch {
    /* import.meta.env not available — fall through */
  }
  if (!raw && typeof document !== "undefined") {
    raw = (document.documentElement.getAttribute("lang") || "").trim();
  }
  const code = raw.toLowerCase().split("-")[0];
  return Object.prototype.hasOwnProperty.call(STRINGS, code) ? code : "en";
}

/** Strings for the current site language (memoized for the page's lifetime). */
function useAuthStrings(): AuthStrings {
  const [lang] = React.useState(resolveAuthLang);
  return STRINGS[lang] || STRINGS.en;
}

// ---------------------------------------------------------------------------
// Session hook
// ---------------------------------------------------------------------------

export interface KleapUser {
  id: string;
  email?: string;
  name?: string;
  image?: string;
}

/** Utilisateur connecté (ou null). `isPending` pendant la résolution. */
export function useKleapUser(): { user: KleapUser | null; isPending: boolean } {
  const db = getKleapDb();
  if (!db) return { user: null, isPending: false };
  const session = db.auth.useSession();
  const pending = Boolean(session?.isPending);
  // 🛟 Failsafe: never let the session probe hang the whole UI forever. If auth
  // is still "pending" after a few seconds (slow / unreachable Neon auth endpoint
  // on a published static site), stop blocking — so a page that gates ALL its
  // content on isPending renders its real (logged-out) UI instead of an infinite
  // "Loading…". When the session does resolve later, the user state still updates
  // normally. Without this, whole-page auth-gated apps shipped a blank loader.
  const [timedOut, setTimedOut] = React.useState(false);
  React.useEffect(() => {
    if (!pending) {
      setTimedOut(false);
      return;
    }
    const t = setTimeout(() => setTimedOut(true), 8000);
    return () => clearTimeout(t);
  }, [pending]);
  return {
    user: (session?.data?.user as KleapUser) ?? null,
    isPending: pending && !timedOut,
  };
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <Input {...props} />
    </label>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      {message}
    </div>
  );
}

function DisabledNotice() {
  const t = useAuthStrings();
  return (
    <div className="rounded-md border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
      {t.dbNotConfigured}
    </div>
  );
}

/** After a successful auth, go to `redirectTo` (default: reload current page). */
function finishAuth(redirectTo?: string) {
  if (redirectTo) window.location.href = redirectTo;
  else window.location.reload();
}

// ---------------------------------------------------------------------------
// Forms
// ---------------------------------------------------------------------------

function SignUpForm({
  redirectTo,
  className,
  onSwitch,
}: {
  redirectTo?: string;
  className?: string;
  onSwitch?: () => void;
}) {
  const t = useAuthStrings();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const db = getKleapDb();
      const res: any = await db!.auth.signUp.email({ email, password, name });
      if (res?.error) {
        setError(res.error.message || t.cantCreate);
        return;
      }
      finishAuth(redirectTo);
    } catch (err: any) {
      setError(err?.message || t.cantCreate);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className={cn("space-y-4", className)}>
      {error && <ErrorBanner message={error} />}
      <GoogleButton redirectTo={redirectTo} />
      <Field
        label={t.name}
        type="text"
        autoComplete="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t.yourName}
      />
      <Field
        label={t.email}
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t.emailPlaceholder}
      />
      <Field
        label={t.password}
        type="password"
        required
        minLength={8}
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={t.passwordHint}
      />
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? t.creating : t.createMyAccount}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {t.alreadyHaveAccount}{" "}
        {onSwitch ? (
          <button
            type="button"
            onClick={onSwitch}
            className="font-medium text-primary hover:underline"
          >
            {t.signIn}
          </button>
        ) : (
          <a href="/login" className="font-medium text-primary hover:underline">
            {t.signIn}
          </a>
        )}
      </p>
    </form>
  );
}

/**
 * Password reset. Without this, a visitor who forgets their password is locked
 * out of the site FOREVER — there was no other way back in. Neon's
 * `/request-password-reset` needs no configuration at all; the endpoint has
 * always answered 200. Its response is deliberately identical whether or not
 * the address exists, so this screen must not reveal it either.
 */
function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const t = useAuthStrings();
  const [email, setEmail] = React.useState("");
  const [sent, setSent] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const db = getKleapDb();
      // Come back to the page they started from: it demonstrably carries this
      // auth UI, so the reset form has somewhere to render.
      const back =
        typeof window === "undefined"
          ? "/"
          : window.location.origin + window.location.pathname;
      await (db!.auth as any).requestPasswordReset({ email, redirectTo: back });
      setSent(true);
    } catch (err: any) {
      setError(err?.message || "Could not send the reset link");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{t.resetEmailSent}</p>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={onBack}
        >
          {t.signIn}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <ErrorBanner message={error} />}
      <Field
        label={t.email}
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t.emailPlaceholder}
      />
      <Button type="submit" className="w-full" disabled={loading}>
        {t.sendResetLink}
      </Button>
      <button
        type="button"
        onClick={onBack}
        className="w-full text-center text-sm text-muted-foreground hover:underline"
      >
        {t.signIn}
      </button>
    </form>
  );
}

/** Second half of the reset: they came back from the e-mail carrying a token. */
function ResetPasswordForm({
  token,
  onDone,
}: {
  token: string;
  onDone: () => void;
}) {
  const t = useAuthStrings();
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const db = getKleapDb();
      const res: any = await (db!.auth as any).resetPassword({
        newPassword: password,
        token,
      });
      if (res?.error) {
        setError(res.error.message || "Could not update the password");
        return;
      }
      setDone(true);
    } catch (err: any) {
      setError(err?.message || "Could not update the password");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{t.passwordUpdated}</p>
        <Button type="button" className="w-full" onClick={onDone}>
          {t.signIn}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <ErrorBanner message={error} />}
      <Field
        label={t.newPassword}
        type="password"
        required
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={t.yourPassword}
      />
      <Button type="submit" className="w-full" disabled={loading}>
        {t.updatePassword}
      </Button>
    </form>
  );
}

/**
 * Google sign-in. Neon Auth ships a SHARED Google OAuth app enabled by default
 * on every project (`GET /auth/oauth_providers` → `[{id:"google",type:"shared"}]`),
 * so the site owner has nothing to create — no Google Cloud project, no client
 * id, no secret. The only prerequisite is the trusted-domain list, which Kleap
 * already fills for `{slug}.kleap.io` and for every custom domain.
 *
 * The SDK routes this through a popup when the page runs inside an iframe (the
 * Kleap preview), so it works there too.
 */
function GoogleButton({ redirectTo }: { redirectTo?: string }) {
  const t = useAuthStrings();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onClick() {
    setError(null);
    setLoading(true);
    try {
      const db = getKleapDb();
      await db!.auth.signIn.social({
        provider: "google",
        callbackURL:
          redirectTo ||
          (typeof window === "undefined" ? "/" : window.location.pathname),
      });
      // A successful call navigates away (or resolves after the popup), so we
      // deliberately do not clear `loading` on the happy path.
    } catch (err: any) {
      setError(err?.message || "Google sign-in failed");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {error && <ErrorBanner message={error} />}
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={loading}
        onClick={onClick}
      >
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.27-4.74 3.27-8.09Z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.82 6.05l3.66 2.84C6.71 7.29 9.14 5.38 12 5.38Z"
          />
        </svg>
        {t.continueWithGoogle}
      </Button>
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          {t.orSeparator}
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}

function SignInForm({
  redirectTo,
  className,
  onSwitch,
  onForgot,
  // When false, the "no account yet? → create one" footer is hidden entirely, so
  // this becomes a pure SIGN-IN affordance with NO public self-signup path. Used
  // by single-owner surfaces (e.g. the CRM scaffold: its `leads` table is readable
  // by ANY authenticated account, so a stranger who could self-signup would read
  // every captured lead — see CrmBoard.tsx). Defaults true = unchanged behavior.
  allowSignUp = true,
}: {
  redirectTo?: string;
  className?: string;
  onSwitch?: () => void;
  onForgot?: () => void;
  allowSignUp?: boolean;
}) {
  const t = useAuthStrings();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const db = getKleapDb();
      const res: any = await db!.auth.signIn.email({ email, password });
      if (res?.error) {
        setError(res.error.message || t.wrongCredentials);
        return;
      }
      finishAuth(redirectTo);
    } catch (err: any) {
      setError(err?.message || t.wrongCredentials);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className={cn("space-y-4", className)}>
      {error && <ErrorBanner message={error} />}
      <GoogleButton redirectTo={redirectTo} />
      <Field
        label={t.email}
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t.emailPlaceholder}
      />
      <Field
        label={t.password}
        type="password"
        required
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={t.yourPassword}
      />
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? t.signingIn : t.signIn}
      </Button>
      {onForgot && (
        <button
          type="button"
          onClick={onForgot}
          className="w-full text-center text-sm text-muted-foreground hover:underline"
        >
          {t.forgotPassword}
        </button>
      )}
      {allowSignUp && (
        <p className="text-center text-sm text-muted-foreground">
          {t.noAccountYet}{" "}
          {onSwitch ? (
            <button
              type="button"
              onClick={onSwitch}
              className="font-medium text-primary hover:underline"
            >
              {t.createAccount}
            </button>
          ) : (
            <a
              href="/signup"
              className="font-medium text-primary hover:underline"
            >
              {t.createAccount}
            </a>
          )}
        </p>
      )}
    </form>
  );
}

// Public standalone forms (for /login + /signup pages).
export function SignUp({
  redirectTo,
  className,
}: {
  redirectTo?: string;
  className?: string;
}) {
  if (!isKleapDbReady && !IS_PREVIEW) return <DisabledNotice />;
  return <SignUpForm redirectTo={redirectTo} className={className} />;
}
export function SignIn({
  redirectTo,
  className,
  // Pass allowSignUp={false} to render a SIGN-IN-ONLY form (no "create account"
  // link) for single-owner surfaces that must NOT expose public self-signup.
  allowSignUp,
}: {
  redirectTo?: string;
  className?: string;
  allowSignUp?: boolean;
}) {
  // The standalone form carries the reset flow too. A generated site that puts
  // <SignIn /> on its own page (the scaffold's login.astro does exactly that)
  // would otherwise show no way back in for someone who forgot their password,
  // and the link from the reset e-mail would land on a form it cannot pass.
  const token =
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("token");
  const [view, setView] = React.useState<"signin" | "forgot" | "reset">(
    token ? "reset" : "signin",
  );
  if (!isKleapDbReady && !IS_PREVIEW) return <DisabledNotice />;
  if (view === "reset" && token)
    return (
      <div className={className}>
        <ResetPasswordForm token={token} onDone={() => setView("signin")} />
      </div>
    );
  if (view === "forgot")
    return (
      <div className={className}>
        <ForgotPasswordForm onBack={() => setView("signin")} />
      </div>
    );
  return (
    <SignInForm
      redirectTo={redirectTo}
      className={className}
      onForgot={() => setView("forgot")}
      allowSignUp={allowSignUp}
    />
  );
}

// ---------------------------------------------------------------------------
// Modal (the bulletproof, no-navigation auth)
//
// Rendered through a PORTAL to <body> so its position:fixed overlay is anchored
// to the viewport — NOT to whatever ancestor happens to hold <UserButton>. A
// sticky header / scroll-reveal animation (Framer, AOS) / hero stage with a
// `transform`, `filter`, `backdrop-filter`, `will-change` or `overflow:hidden`
// would otherwise capture the fixed positioning and push the modal off-frame or
// clip it. The portal escapes all of that — the modal always centers on screen.
// ---------------------------------------------------------------------------

// Ref-counted background scroll-lock so two stacked modals don't leave the page
// permanently locked (the second restore would otherwise win with "hidden").
let _scrollLockCount = 0;
let _prevBodyOverflow = "";
function lockBodyScroll() {
  if (typeof document === "undefined") return;
  if (_scrollLockCount === 0) {
    _prevBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  _scrollLockCount += 1;
}
function unlockBodyScroll() {
  if (typeof document === "undefined") return;
  _scrollLockCount = Math.max(0, _scrollLockCount - 1);
  if (_scrollLockCount === 0) document.body.style.overflow = _prevBodyOverflow;
}

function AuthModal({
  initial = "signin",
  redirectTo,
  onClose,
  // When false, the modal is SIGN-IN ONLY — it opens on sign-in, the "create
  // account" switch is hidden, and the sign-up form is unreachable (no toggle,
  // no /signup link). Used by single-owner surfaces (e.g. the CRM scaffold whose
  // `leads` table is readable by ANY authenticated account). Defaults true =
  // unchanged behavior (sign-in + sign-up with a toggle between them).
  allowSignUp = true,
}: {
  initial?: "signin" | "signup";
  redirectTo?: string;
  onClose: () => void;
  allowSignUp?: boolean;
}) {
  const t = useAuthStrings();
  // A visitor arriving from the reset e-mail carries `?token=`. Open straight
  // on the "set a new password" screen — otherwise the link lands on a sign-in
  // form they cannot pass, which is the dead end this whole flow removes.
  const resetToken =
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("token");
  const [mode, setMode] = React.useState<
    "signin" | "signup" | "forgot" | "reset"
  >(resetToken ? "reset" : allowSignUp ? initial : "signin");

  const cardRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();

  // Escape closes, focus moves into the modal on open and is restored to the
  // trigger on close, Tab is trapped inside the card, and the background scroll
  // is locked (ref-counted). a11y: the card is role="dialog" aria-modal below.
  React.useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    lockBodyScroll();
    const focusables = () =>
      Array.from(
        cardRef.current?.querySelectorAll<HTMLElement>(
          'input,button,select,textarea,a[href],[tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((el) => !el.hasAttribute("disabled"));
    const tid = setTimeout(() => focusables()[0]?.focus(), 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab") {
        const f = focusables();
        if (f.length === 0) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(tid);
      document.removeEventListener("keydown", onKey);
      unlockBodyScroll();
      prevFocus?.focus?.();
    };
  }, [onClose]);

  const overlay = (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483000,
        background: "rgba(0,0,0,.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        overflowY: "auto",
      }}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm space-y-5 rounded-xl border border-border bg-card p-7 shadow-xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t.close}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
        <div className="space-y-1 text-center">
          <h2 id={titleId} className="text-xl font-semibold tracking-tight">
            {mode === "signin" ? t.welcomeBack : t.createAccount}
          </h2>
          <p className="text-sm text-muted-foreground">
            {mode === "signin" ? t.signInToContinue : t.quick}
          </p>
        </div>
        {mode === "reset" && resetToken ? (
          <ResetPasswordForm
            token={resetToken}
            onDone={() => setMode("signin")}
          />
        ) : mode === "forgot" ? (
          <ForgotPasswordForm onBack={() => setMode("signin")} />
        ) : mode === "signin" || !allowSignUp ? (
          <SignInForm
            redirectTo={redirectTo}
            onSwitch={allowSignUp ? () => setMode("signup") : undefined}
            onForgot={() => setMode("forgot")}
            allowSignUp={allowSignUp}
          />
        ) : (
          <SignUpForm
            redirectTo={redirectTo}
            onSwitch={() => setMode("signin")}
          />
        )}
      </div>
    </div>
  );

  // No document during SSR — but auth is client:only, so this is just defensive.
  if (typeof document === "undefined") return null;
  return createPortal(overlay, document.body);
}

// ---------------------------------------------------------------------------
// UserButton — header entry point (opens the modal; no page navigation)
// ---------------------------------------------------------------------------

export function UserButton({
  redirectTo,
  afterSignOut,
  className,
  // Pass allowSignUp={false} to make the signed-out affordance SIGN-IN ONLY: no
  // "create account" button, and the modal it opens can't reach a sign-up form.
  // For single-owner surfaces whose data is readable by any authenticated account
  // (e.g. the CRM scaffold's world-readable `leads` table). Defaults true so every
  // existing <UserButton/> call site is unchanged (sign-in + create-account).
  allowSignUp,
}: {
  /** Where to go after sign-in/sign-up (default: reload current page). */
  redirectTo?: string;
  afterSignOut?: string;
  className?: string;
  allowSignUp?: boolean;
}) {
  if (!isKleapDbReady) return null;
  return (
    <UserButtonInner
      redirectTo={redirectTo}
      afterSignOut={afterSignOut}
      className={className}
      allowSignUp={allowSignUp}
    />
  );
}

function UserButtonInner({
  redirectTo,
  afterSignOut,
  className,
  allowSignUp = true,
}: {
  redirectTo?: string;
  afterSignOut?: string;
  className?: string;
  allowSignUp?: boolean;
}) {
  const t = useAuthStrings();
  const { user, isPending } = useKleapUser();
  const [modal, setModal] = React.useState<null | "signin" | "signup">(null);

  async function onSignOut() {
    const db = getKleapDb();
    try {
      await db!.auth.signOut();
    } finally {
      if (afterSignOut) window.location.href = afterSignOut;
      else window.location.reload();
    }
  }

  if (isPending) {
    return <div className="h-9 w-24 animate-pulse rounded-md bg-muted" />;
  }

  if (!user) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Button variant="ghost" size="sm" onClick={() => setModal("signin")}>
          {t.signIn}
        </Button>
        {allowSignUp && (
          <Button size="sm" onClick={() => setModal("signup")}>
            {t.createAccount}
          </Button>
        )}
        {modal && (
          <AuthModal
            initial={modal}
            redirectTo={redirectTo}
            onClose={() => setModal(null)}
            allowSignUp={allowSignUp}
          />
        )}
      </div>
    );
  }

  const initial = (user.name || user.email || "?").charAt(0).toUpperCase();
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
        {initial}
      </span>
      <span className="hidden text-sm text-foreground sm:inline">
        {user.name || user.email}
      </span>
      <Button variant="ghost" size="sm" onClick={onSignOut}>
        {t.signOut}
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AuthGate — render children only when signed in
// ---------------------------------------------------------------------------

export function AuthGate({
  children,
  fallback,
}: {
  children: React.ReactNode;
  /** Shown while signed out (default: a sign-in form). */
  fallback?: React.ReactNode;
}) {
  if (IS_PREVIEW) return <>{children}</>; // builder preview → show the content
  if (!isKleapDbReady) return <DisabledNotice />;
  return <AuthGateInner fallback={fallback}>{children}</AuthGateInner>;
}

function AuthGateInner({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { user, isPending } = useKleapUser();
  if (isPending) {
    return <div className="h-24 w-full animate-pulse rounded-md bg-muted" />;
  }
  if (!user) return <>{fallback ?? <SignIn />}</>;
  return <>{children}</>;
}
