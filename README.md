This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

### meu env

# Banco de dados local

DATABASE_URL="postgresql://secp:secp_dev_password@localhost:5432/secp_dev?schema=public"

# Auth.js / NextAuth v5

AUTH_SECRET="2e11fe328d2fa07f0152a1557d1003f71d2889f6993552cad3eff0871970f856"
AUTH_URL="http://localhost:3000"
AUTH_TRUST_HOST="true"

# Usuário inicial do sistema

SECP_ADMIN_MATRICULA="secp"
SECP_ADMIN_SENHA="secp"
SECP_ADMIN_NOME="Administrador SECP"
SECP_ADMIN_EMAIL="secp@localhost"

# LDAP / Active Directory - configurar depois

LDAP_URL="ldap://srvdc1-am.jfam.local:389"
LDAP_BASE_DN="DC=jfam,DC=local"
LDAP_DOMAIN="JFAM"
LDAP_BIND_DN=""
LDAP_BIND_PASSWORD=""

# Ambiente

NODE_ENV="development"
APP_TIMEZONE="America/Manaus"

## fim env
