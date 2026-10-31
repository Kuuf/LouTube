---
name: loutube-features
description: Directory of LouTube's TV features (spatial nav, zones, focus lock, focus looks, long press, text fields, on-screen keyboard, channel tabs, build and version) with the file that owns each one and how to use it. Use before adding or changing remote-control behavior, a page's navigation, scrolling or focus styling, or when building an APK.
---

# LouTube feature directory

LouTube is FreeTube Android reworked for TV remotes. Everything is reachable
with the D-pad (arrows), OK (Enter) and Back. Find the feature below, read its
owning file, and reuse it rather than writing a new mechanism.

All paths are relative to the repo root. `NavManager.js` means
`src/renderer/helpers/spatialNav/NavManager.js`.

## Spatial nav (remote control)

The core of the TV UI. One global keydown listener (`initGlobalKeyListener`,
started in `src/renderer/App.vue`) moves a focus cursor between cells of grids
called zones.

- **Engine:** `NavManager.js`. Read its header comments first.
- **State:** `navState` (reactive) holds `zones`, `activeZoneId`,
  `lastContentZoneId` and `lastPosition` per zone.
- **Focused cell:** gets `data-spatial-nav-focused`. DOM focus is released
  except on text fields, sliders and selects.
- **Enter:** clicks the cell's first link or button, or calls the zone's
  `onSelect`. On text fields it gives DOM focus.
- **Prompts:** while a `.prompt` (FtPrompt) is open, spatial nav ignores keys.

### Zones

`src/renderer/composables/useSpatialZone.js` registers a zone for a
component's lifetime:

```js
const zone = useSpatialZone('my-zone', gridFn, {
  edges: { left: 'sidebar', up: 'other-zone', down: () => (cond ? 'z' : null) },
  isChrome: false,         // persistent UI beside the page (side nav)
  active: false,           // activate on mount
  centerInPage: false,     // focus lock against the page scroll, see below
  noDeadEndScroll: false,  // Up/Down at a dead end don't scroll the page
  onKeyDown: (event) => false, // sees keys first; return true if handled
  onSelect: (position, cell) => {},
})
zone.activate({ resetPosition }) // zone.isActive, zone.focusedPosition, zone.isFocused(r, c)
```

- **Edges:** a zone id, `{ id, resetPosition }`, or a function returning one
  (or `null` for nothing). The side nav's zone id is `'sidebar'`.
- **Grids:** rows of cells, called fresh on every key press.
  - `gridFromElements(elements)` groups elements into rows by where they are on
    screen, and skips hidden ones.
  - `focusableGrid(container, excludeSelector)` and `pageGrid(...)` collect a
    container's controls.
  - `null` cells are skipped.
  - The same element repeated across columns is one wide cell. Left/Right skip
    its other columns. Example: the search keyboard's bottom row.
- **Item marker:** put `ITEM_ATTRIBUTE` (`data-spatial-nav-item`) on list
  items so grids can find them.

### Ready-made setups

- **Whole page as one zone:** `src/renderer/composables/useTvPage.js`
  (`useTvPage(zoneId, { startOn, exclude, topOnFirstRow, left })`). Used by
  Popular, Trending, History, UserPlaylists, About, Post and Hashtag.
- **Page-specific composables:**
  - `src/renderer/views/Channel/useTvChannel.js` (header and content zones,
    focusing a tab opens it)
  - `src/renderer/views/Watch/useTvWatch.js` (player, player menu, Up Next)
  - `src/renderer/views/Playlist/useTvPlaylist.js`
- **Settings and profiles:** two-zone pages (nav and content).
  - `src/renderer/views/Settings/Settings.vue`
  - `src/renderer/views/TV/TVProfileManage.vue`
  - `src/renderer/views/TV/TVProfiles.vue`

## Focus lock (focus held in the middle, content scrolls under it)

The focused item stays in the middle of its scroller while the content moves.
Near the start or end, where the content can't scroll further, the focus moves
on instead. Pick the variant that matches the scroller:

| Scroller | How | Used by |
|---|---|---|
| Vertical list in its own scroller, with a still highlight | `src/renderer/components/TvScrollList/TvScrollList.vue` (slot `item`, bind `itemAttrs`, `scroller-class`, `highlight-class`, `land-on`) | Side nav (`SideNav.vue`), Settings nav, `SubscriptionsChannelNav.vue` |
| Any scroller element | `data-spatial-nav-scroll="center"` on the scroller (NavManager `scrollToCenterAnimated`) | TvScrollList internally |
| List items scrolling with the page, with a growing backdrop focus look | `data-spatial-nav-center` on the item (`CENTER_ATTRIBUTE`, look in `spatialNav.css`) | Video, channel and playlist cards (`FtListLazyWrapper.vue`) |
| A whole zone scrolling with the page, no focus-look change | zone option `centerInPage: true` | Settings content (`Settings.vue`) |
| Horizontal row | `scrollTabIntoView` and `animateTabsScroll` in `src/renderer/components/ChannelDetails/ChannelDetails.vue`, called from `useTvChannel.js` | Channel tabs (one line, edge fades) |

Helpers in `NavManager.js`: `centeredScrollTop`, `scrollToCenterAnimated`,
`scrollToViewTopAnimated(element, offset)` and `scrollPageToTopAnimated()`.

Two gotchas:
- A smooth `scrollTo` gets cancelled when content changes on focus. Animate
  frame by frame instead, like `animateTabsScroll`.
- A `nowrap` row can widen the whole page. Add `contain: inline-size` to the
  row.

## Dead-end scrolling

By default, Up/Down with nowhere to go scrolls the page 160px
(`DEAD_END_SCROLL`), so you can read past the last control. Turn this off per
zone with `noDeadEndScroll: true`. The search page does this.

## Focus looks

`src/renderer/spatialNav.css` styles `[data-spatial-nav-focused]`:

- **Text controls** (buttons, tabs, links, rows): text and background colors
  swapped.
- **Visual items** (cards, images, avatars, anything with
  `data-spatial-nav-visual`): a soft background and shadow.
- **Centered items:** a backdrop that grows behind the item.
- **Pressed look:** `data-spatial-nav-pressed` while Enter is held.

Override per page with a scoped `[data-spatial-nav-focused]` rule. See
`.navItem` in `Settings.css`.

## Long press (hold OK)

- Put `data-spatial-nav-long-press` on a cell and listen for
  `@spatial-nav-long-press` (`LONG_PRESS_EVENT`, `LONG_PRESS_MS` = 500).
- A short press still selects the cell, on release.
- Video cards use it to open the actions panel:
  - `src/renderer/components/TvItemActionsPanel/` (`itemActions.js`:
    `openItemActions`, `closeItemActions`)
  - wired up in `FtListLazyWrapper.vue`

## Text fields

- A text field is ready to type into as soon as the cursor lands on it, and on
  Android TV the system keyboard opens.
- Up/Down leave the field.
- Left/Right leave only when the caret is at the field's start or end
  (`isCaretAtEdge`).
- The app's search field is `src/renderer/components/FtSearchInput/`, which
  wraps `FtInput`.

## Search page and on-screen keyboard

- **Page:** `src/renderer/views/TV/TVSearch.vue` (route `tvSearch`,
  `/tv/search/:query?`).
  - The keyboard takes the left third of the page.
  - The search bar and results take the right two thirds.
  - Search runs 2 s after typing stops (`AUTO_SEARCH_DELAY_MS`).
  - The page starts on the keyboard.
- **Keyboard:** `src/renderer/components/TvSearchKeyboard/` emits `type`,
  `backspace` and `clear`.

## Side nav

`src/renderer/components/SideNav/SideNav.vue` is a TvScrollList zone named
`'sidebar'` with `isChrome`. To come back from it to the page, use
`navState.lastContentZoneId`.

## Build, version, install

- **Build:** run `pnpm build:apk` from the repo root with Node 22 (fnm).
  - It bumps the patch version in `package.json` (1.0.5 to 1.0.6), packs the
    web assets and runs Gradle.
  - It prints the APK path:
    `android/app/build/outputs/apk/debug/loutube-v<version>.apk`.
  - Commit the version bump afterwards.
- **Version code:** `300000000 + major*1000000 + minor*1000 + patch`
  (`android/app/build.gradle.kts`). It stays above the old FreeTube codes, so
  updates install over them.
- **App ID:** `io.freetubeapp.loutube`. Never change it, or updates won't
  install over the existing app and its data.
- **Install on Waydroid:**
  `sudo waydroid shell -- pm install -r /data/local/tmp/<apk>`. `-r` keeps the
  app's data.
- **Launcher assets:** the TV banner is `res/drawable-*/tv_banner.png`. The
  icon is `res/drawable/ic_launcher_foreground.xml` with
  `drawable-nodpi/loutube_logo.png`. The app name is `values/strings.xml`.

## Testing in the dev app

- Run `pnpm debug`. It starts Electron with remote debugging on port 9223.
- Drive it over CDP: set `location.hash`, send arrow keys with
  `Input.dispatchKeyEvent`, and read `[data-spatial-nav-focused]`.
- Before any Enter, read which element has the focus. Never send Enter in the
  Privacy or Data settings: a blind Enter there once opened "Remove All
  Subscriptions".
- To try narrow screens, use `Emulation.setDeviceMetricsOverride`.
