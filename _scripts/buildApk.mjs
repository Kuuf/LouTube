// Builds a LouTube APK with the next patch version (1.0.4 -> 1.0.5): bumps
// the version in package.json, packs the web assets and runs Gradle. The APK
// ends up in android/app/build/outputs/apk/debug/loutube-v<version>.apk.
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const packageJsonPath = join(root, 'package.json')

const packageJson = readFileSync(packageJsonPath, 'utf8')
const { version } = JSON.parse(packageJson)
const [major, minor, patch] = version.split('-')[0].split('.').map(Number)
const nextVersion = `${major}.${minor}.${patch + 1}`

// Only the version line changes, the file's formatting stays
writeFileSync(packageJsonPath, packageJson.replace(`"version": "${version}"`, `"version": "${nextVersion}"`))
console.log(`Version ${version} -> ${nextVersion}`)

execSync('pnpm run pack:android', { cwd: root, stdio: 'inherit' })
execSync('sh gradlew assembleDebug', { cwd: join(root, 'android'), stdio: 'inherit' })

console.log(`\nAPK: ${join(root, 'android/app/build/outputs/apk/debug', `loutube-v${nextVersion}.apk`)}`)
