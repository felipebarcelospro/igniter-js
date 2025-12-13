import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: [
    '@igniter-js/core',
    '@react-email/components',
    'react',
    'resend',
    'postmark',
    'sendgrid',
    'nodemailer',
  ],
})
