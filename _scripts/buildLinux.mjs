// Builds LouTube for Linux (x64, or arm64 with `pnpm build:linux arm64`) with
// the next patch version, like build:apk: bumps the version in package.json,
// packs the app and runs electron-builder. Works from macOS too.
//
// Output in build/:
//   loutube-v<version>-<arch>.AppImage  one file, run it directly
//   loutube-v<version>-<arch>.deb       for Debian/Ubuntu
//
// The app is named LouTube (data in ~/.config/LouTube), so it doesn't share
// settings or the single-instance lock with an installed upstream FreeTube.
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

execSync('pnpm run pack', { cwd: root, stdio: 'inherit' })

// Imported after the bump, so the packaged app gets the new version
const { Arch, build, Platform } = await import('electron-builder')
const { default: config } = await import('./ebuilder.config.mjs')

const arch = process.argv[2] === 'arm64' ? Arch.arm64 : Arch.x64

const output = await build({
  targets: Platform.LINUX.createTarget(['AppImage', 'deb'], arch),
  publish: 'never',
  config: {
    ...config,
    appId: 'io.freetubeapp.loutube',
    productName: 'LouTube',
    // desktopName: the window's WM_CLASS, so docks match it to its .desktop entry
    extraMetadata: { name: 'loutube', productName: 'LouTube', version: nextVersion, desktopName: 'loutube.desktop' },
    linux: {
      ...config.linux,
      executableName: 'loutube',
      artifactName: `loutube-v${nextVersion}-\${arch}.\${ext}`,
      desktop: { entry: { Name: 'LouTube' } },
    },
  },
})
console.log(output)
