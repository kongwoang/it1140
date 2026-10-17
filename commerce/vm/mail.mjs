import nodemailer from 'nodemailer';
export function mailTransport(cfg){return nodemailer.createTransport({host:cfg.SMTP_HOST,port:Number(cfg.SMTP_PORT||587),
  secure:cfg.SMTP_SECURE==='true',requireTLS:cfg.SMTP_SECURE!=='true',pool:true,maxConnections:3,
  auth:{user:cfg.SMTP_USER,pass:cfg.SMTP_PASSWORD},connectionTimeout:10000,socketTimeout:15000});}
