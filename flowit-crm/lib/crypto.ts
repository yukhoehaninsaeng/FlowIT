import { createCipheriv, createDecipheriv } from 'crypto'

const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex')
const IV = Buffer.from(process.env.ENCRYPTION_IV!, 'hex')

export function encrypt(text: string): string {
  const cipher = createCipheriv('aes-256-cbc', KEY, IV)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  return encrypted.toString('hex')
}

export function decrypt(encrypted: string): string {
  const decipher = createDecipheriv('aes-256-cbc', KEY, IV)
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'hex')),
    decipher.final()
  ])
  return decrypted.toString('utf8')
}
