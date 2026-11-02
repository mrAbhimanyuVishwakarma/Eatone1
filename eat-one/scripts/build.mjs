// Local .env may select development for the Node server; always compile React for production.
process.env.NODE_ENV='production';
const {build}=await import('vite');
await build();
