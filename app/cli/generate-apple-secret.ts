import { importPKCS8, SignJWT } from "jose"
import { readFileSync } from "fs"

const privateKey = readFileSync("./AuthKey_6NAGDPA4GN.p8", "utf-8")
const teamId = "8XA6242P8D"
const keyId = "6NAGDPA4GN"
const clientId = "ai.plagg.plagg.signin"

const key = await importPKCS8(privateKey, "ES256")
const now = Math.floor(Date.now() / 1000)
const secret = await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId })
    .setIssuer(teamId)
    .setSubject(clientId)
    .setAudience("https://appleid.apple.com")
    .setIssuedAt(now)
    .setExpirationTime(now + 180 * 24 * 60 * 60)
    .sign(key)

console.log(secret)
