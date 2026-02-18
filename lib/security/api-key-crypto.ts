import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto"

const ENCRYPTION_PREFIX = "enc"
const ENCRYPTION_VERSION = "v1"
const ENCRYPTION_PREFIX_WITH_VERSION = `${ENCRYPTION_PREFIX}:${ENCRYPTION_VERSION}:`
const IV_LENGTH_BYTES = 12
const AUTH_TAG_LENGTH_BYTES = 16
const DERIVATION_SALT = "mumnhun/api-keys/v1"

let cachedEncryptionKey: Buffer | null = null

export class ApiKeyCryptoConfigError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "ApiKeyCryptoConfigError"
    }
}

export class ApiKeyCryptoError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "ApiKeyCryptoError"
    }
}

function decodeSecretWithPrefix(secret: string, encodingPrefix: "base64:" | "hex:"): Buffer {
    const encoded = secret.slice(encodingPrefix.length).trim()
    if (!encoded) {
        throw new ApiKeyCryptoConfigError("API_KEYS_ENCRYPTION_SECRET value is empty")
    }

    const encoding = encodingPrefix === "base64:" ? "base64" : "hex"
    const buffer = Buffer.from(encoded, encoding)

    if (buffer.length !== 32) {
        throw new ApiKeyCryptoConfigError("API_KEYS_ENCRYPTION_SECRET must resolve to exactly 32 bytes")
    }

    return buffer
}

function getEncryptionKey(): Buffer {
    if (cachedEncryptionKey) {
        return cachedEncryptionKey
    }

    const secret = process.env.API_KEYS_ENCRYPTION_SECRET?.trim()
    if (!secret) {
        throw new ApiKeyCryptoConfigError("API_KEYS_ENCRYPTION_SECRET is missing")
    }

    if (secret.startsWith("base64:")) {
        cachedEncryptionKey = decodeSecretWithPrefix(secret, "base64:")
        return cachedEncryptionKey
    }

    if (secret.startsWith("hex:")) {
        cachedEncryptionKey = decodeSecretWithPrefix(secret, "hex:")
        return cachedEncryptionKey
    }

    cachedEncryptionKey = scryptSync(secret, DERIVATION_SALT, 32)
    return cachedEncryptionKey
}

export function isEncryptedApiKey(value: string): boolean {
    return value.startsWith(ENCRYPTION_PREFIX_WITH_VERSION)
}

export function encryptApiKey(plaintextApiKey: string): string {
    const value = plaintextApiKey.trim()
    if (!value) {
        throw new ApiKeyCryptoError("API key cannot be empty")
    }

    const key = getEncryptionKey()
    const iv = randomBytes(IV_LENGTH_BYTES)

    const cipher = createCipheriv("aes-256-gcm", key, iv)
    const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()])
    const authTag = cipher.getAuthTag()

    return `${ENCRYPTION_PREFIX}:${ENCRYPTION_VERSION}:${iv.toString("base64")}:${authTag.toString("base64")}:${ciphertext.toString("base64")}`
}

function parseEncryptedValue(encryptedApiKey: string): { iv: Buffer; authTag: Buffer; ciphertext: Buffer } {
    const parts = encryptedApiKey.split(":")
    if (parts.length !== 5 || parts[0] !== ENCRYPTION_PREFIX || parts[1] !== ENCRYPTION_VERSION) {
        throw new ApiKeyCryptoError("Unsupported encrypted API key format")
    }

    const iv = Buffer.from(parts[2], "base64")
    const authTag = Buffer.from(parts[3], "base64")
    const ciphertext = Buffer.from(parts[4], "base64")

    if (iv.length !== IV_LENGTH_BYTES || authTag.length !== AUTH_TAG_LENGTH_BYTES || ciphertext.length === 0) {
        throw new ApiKeyCryptoError("Invalid encrypted API key payload")
    }

    return { iv, authTag, ciphertext }
}

function decryptEncryptedApiKey(encryptedApiKey: string): string {
    const { iv, authTag, ciphertext } = parseEncryptedValue(encryptedApiKey)
    const key = getEncryptionKey()

    try {
        const decipher = createDecipheriv("aes-256-gcm", key, iv)
        decipher.setAuthTag(authTag)
        const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8")

        if (!plaintext) {
            throw new ApiKeyCryptoError("Decrypted API key is empty")
        }

        return plaintext
    } catch (error) {
        if (error instanceof ApiKeyCryptoError) {
            throw error
        }
        throw new ApiKeyCryptoError("Failed to decrypt encrypted API key")
    }
}

export function decryptStoredApiKey(storedApiKey: string): string {
    if (!isEncryptedApiKey(storedApiKey)) {
        return storedApiKey
    }

    return decryptEncryptedApiKey(storedApiKey)
}

