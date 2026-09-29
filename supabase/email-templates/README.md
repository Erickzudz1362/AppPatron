# Correos de autenticación de El Patrón

Configurar en Supabase Dashboard → Authentication → Email Templates:

- Confirm signup: asunto `Confirma tu cuenta en El Patrón` y `confirm-signup.html`.
- Reset password: asunto `Recupera tu contraseña de El Patrón` y `reset-password.html`.
- Magic link: asunto `Tu acceso seguro a El Patrón` y `magic-link.html`.
- Invite user: asunto `Te invitaron a AppPatron` y `invite-user.html`.

Antes de guardar, verificar en Authentication → URL Configuration:

- Site URL: URL productiva de la PWA.
- Redirect URLs: dominio productivo, `barberiaelpatron://**` y las URLs de pruebas necesarias.

No pegar claves, contraseñas ni datos de clientes dentro de una plantilla.
