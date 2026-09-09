/**
 * Packs the built extension for a release and for addons.mozilla.org:
 *
 *   release/zoreal-mark-firefox-<version>.zip         the extension, from dist/
 *   release/zoreal-mark-firefox-<version>-source.zip  the source tree at HEAD
 *
 * The version is read from the built manifest so the file names and the
 * package never disagree. Run `npm run build` first.
 *
 * The source archive exists because the package is bundled by Vite and
 * Mozilla's reviewers read the code as written, not as bundled: they build
 * it themselves from this archive and compare. It is `git archive` of HEAD
 * plus the lockfile, so it holds exactly what the repository holds; the
 * README's Development section is the build instruction it carries.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';

if (!existsSync('dist/manifest.json')) { console.error('no dist/manifest.json: run npm run build first'); process.exit(1); }
const { version } = JSON.parse(readFileSync('dist/manifest.json', 'utf8'));
mkdirSync('release', { recursive: true });
const out = `release/zoreal-mark-firefox-${version}.zip`;
rmSync(out, { force: true });
execFileSync('zip', ['-r', '-X', `../${out}`, '.', '-x', '.*', '-x', '*/.*'], { cwd: 'dist', stdio: 'inherit' });
console.log(out);
const src = `release/zoreal-mark-firefox-${version}-source.zip`;
rmSync(src, { force: true });
execFileSync('git', ['archive', '--format=zip', '-o', src, 'HEAD'], { stdio: 'inherit' });
console.log(src);
