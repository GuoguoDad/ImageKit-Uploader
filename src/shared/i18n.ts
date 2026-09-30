/**
 * 主进程 / 渲染进程共享的文案字典。
 *
 * - `en` 是唯一的事实来源：`MessageKey` 由它推导，`zh` 必须覆盖全部键，
 *   漏翻或写错键名都会在 `npm run typecheck` 阶段暴露。
 * - 文案里的占位符写成 `{name}`，由 `translate()` 的第二个参数替换。
 * - 默认语言是 `en`；用户可在界面里切换，选择持久化在 config.json 的 `language` 字段。
 */

/** 支持的语言 */
export type Language = 'en' | 'zh'

/** 默认语言：按需求默认英文 */
export const DEFAULT_LANGUAGE: Language = 'en'

/** 语言展示名（习惯上用该语言自身的写法，因此两种语言下都相同） */
export const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'English',
  zh: '简体中文'
}

const en = {
  /* ------------------------------ 通用 ------------------------------ */
  'common.close': 'Close',
  'common.cancel': 'Cancel',
  'common.refresh': 'Refresh',
  'common.up': 'Up',
  'common.root': 'Root',
  'common.enter': 'Open',
  'common.retry': 'Retry',
  'common.remove': 'Remove',
  'common.copyLink': 'Copy link',
  'common.copyMarkdown': 'Copy Markdown',
  'common.openInBrowser': 'Open in browser',
  'common.deleteRecord': 'Delete entry',
  'common.loading': 'Loading…',
  'common.loadingMore': 'Loading…',
  'common.syncing': 'Indexing',
  'common.private': 'Private',
  'common.back': 'Back to {path}',
  'common.alreadyRoot': 'Already at the root',
  'common.newFolder': 'New folder',
  'common.newFolderPlaceholder': 'Folder name, e.g. banner',
  'common.creating': 'Creating…',
  'common.create': 'Create',
  'common.configure': 'Set up now',
  'common.copied': 'Copied to clipboard',
  'common.copyFailed': 'Copy failed, please copy manually',
  'common.copyFailedShort': 'Copy failed',

  /* ------------------------------ 主题 ------------------------------ */
  'theme.dark': 'Dark',
  'theme.light': 'Light',
  'theme.system': 'System',
  'theme.tooltip': 'Theme: {theme} (click to switch)',

  /* ------------------------------ 语言 ------------------------------ */
  'language.label': 'Language',
  'language.hint': 'Interface language, saved to the config file',
  'language.tooltip': 'Interface language: {language}',

  /* ------------------------------ 顶栏 / 全局 ------------------------------ */
  'app.subtitle': 'ImageKit Uploader',
  'app.credentialsReady': 'Credentials configured',
  'app.credentialsMissing': 'Credentials required',
  'app.settings': 'Settings',
  'app.banner': 'ImageKit credentials are not configured yet. Fill in the Public Key and Private Key before uploading.',
  'app.configureNow': 'Set up now',
  'app.tab.queue': 'Queue',
  'app.tab.history': 'History',
  'app.tab.local': 'Local folders',
  'app.tab.remote': 'ImageKit folders',
  'app.tool.uploadAll': 'Upload all',
  'app.tool.copyAllLinks': 'Copy all links',
  'app.tool.clearDone': 'Clear finished',
  'app.foot.queue': 'Queue {total}',
  'app.foot.waiting': ' · {n} waiting',
  'app.foot.running': ' · {n} uploading',
  'app.foot.done': ' · {n} succeeded',
  'app.foot.failed': ' · {n} failed',
  'app.foot.uploaded': '{n} uploaded this session',
  'app.foot.configFile': 'Config file',

  /* ------------------------------ 拖拽区 ------------------------------ */
  'drop.reading': 'Reading files…',
  'drop.title': 'Drop files or folders here',
  'drop.hintPrefix': 'Or click to choose files · paste a clipboard image with ',
  'drop.hintShortcut': '⌘/Ctrl + V',
  'drop.hintSuffix': '',
  'drop.pickFile': 'Choose files',
  'drop.pickFolder': 'Choose folder',

  /* ------------------------------ 上传参数 ------------------------------ */
  'opt.folder': 'Folder',
  'opt.browse': 'Browse',
  'opt.browseTitle': 'Browse ImageKit folders and pick an upload target',
  'opt.tags': 'Tags',
  'opt.tagsPlaceholder': 'Comma separated, e.g. cover,banner',
  'opt.unique': 'Unique filename',
  'opt.uniqueTitle': 'Append a random suffix to duplicate names instead of overwriting',
  'opt.concurrency': 'Parallel',
  'opt.concurrencyTitle': 'Number of simultaneous uploads',

  /* ------------------------------ 上传队列 ------------------------------ */
  'queue.status.pending': 'Waiting',
  'queue.status.uploading': 'Uploading',
  'queue.status.success': 'Done',
  'queue.status.error': 'Failed',
  'queue.status.canceled': 'Canceled',
  'queue.queuedNote': ' · queued',
  'queue.uploadNow': 'Upload now',
  'queue.cancelUpload': 'Cancel upload',
  'queue.empty': 'Queue is empty',
  'queue.emptyHint': 'Add files and uploading starts automatically',

  /* ------------------------------ 历史记录 ------------------------------ */
  'history.empty': 'No uploads yet',
  'history.emptyHint': 'Successful uploads are kept here, up to 300 entries',
  'history.count': '{n} entries',
  'history.clear': 'Clear history',

  /* ------------------------------ 设置 ------------------------------ */
  'settings.title': 'Settings',
  'settings.subtitle': 'Credentials are written to the local config file, which you can edit at any time',
  'settings.credentials': 'ImageKit credentials',
  'settings.nameHint': 'Display name / account label',
  'settings.privateHint': 'Stored on this machine only, used to sign uploads',
  'settings.urlHint': 'Used to build the final public link',
  'settings.show': 'Show',
  'settings.hide': 'Hide',
  'settings.testing': 'Testing…',
  'settings.saveAndTest': 'Save & test connection',
  'settings.defaults': 'Upload defaults',
  'settings.defaultFolder': 'Default folder',
  'settings.defaultTags': 'Default tags',
  'settings.tagsPlaceholder': 'Comma separated',
  'settings.concurrency': 'Parallel uploads',
  'settings.customEndpoint': 'Custom upload endpoint',
  'settings.customEndpointPlaceholder': 'Leave empty for the official endpoint',
  'settings.apiEndpoint': 'Management API base URL',
  'settings.apiEndpointPlaceholder': 'Leave empty for https://api.imagekit.io/v1',
  'settings.uniqueDefault': 'Enable unique filenames by default (avoid overwriting)',
  'settings.appearance': 'Interface',
  'settings.configFile': 'Config file',
  'settings.configHint': 'Edit and save the file, then click “Reload config” — no restart needed.',
  'settings.openFile': 'Open config file',
  'settings.reload': 'Reload config',
  'settings.saving': 'Saving…',
  'settings.save': 'Save',

  /* ------------------------------ 本地目录浏览 ------------------------------ */
  'local.noFolder': 'No folder selected',
  'local.noFolderHint': 'Pick a local folder to list its sub-folders and files',
  'local.pickFolder': 'Choose folder',
  'local.showHidden': 'Show hidden files',
  'local.groupDirs': 'Folders',
  'local.groupFiles': 'Files',
  'local.truncated': 'Too many entries — showing the first {shown} of {total}',
  'local.emptyDir': 'This folder is empty',
  'local.symlink': 'Symbolic link',
  'local.includeSub': 'Include sub-folders',
  'local.includeSubTitle': 'Whether “Add current folder files” also includes files in sub-folders',
  'local.selectAll': 'Select all files ({n})',
  'local.deselectAll': 'Deselect all',
  'local.clearSelection': 'Clear selection',
  'local.addCurrent': 'Add current folder files',
  'local.addRecursive': 'Add files (incl. sub-folders)',
  'local.addSelected': 'Add selected',

  /* ------------------------------ 云端目录浏览 ------------------------------ */
  'remote.needConfig': 'ImageKit credentials required',
  'remote.needConfigHint': 'Fill in the Public Key and Private Key to browse remote folders and files',
  'remote.notOpened': 'No remote folder opened yet',
  'remote.loadFailed': 'Failed to load the remote folder',
  'remote.introHint': 'Browse the folders and files on ImageKit and pick where to upload',
  'remote.openRoot': 'Open root folder',
  'remote.targetValue': 'Target: {path}',
  'remote.targetTitle': 'Upload target folder: {path}',
  'remote.rowTitle': 'Click to set {path} as the upload folder · double-click to open it',
  'remote.rowOpenTitle': 'Open {path}',
  'remote.indexBadge': 'ImageKit is still indexing this folder; it will sync automatically',
  'remote.isTarget': 'Upload target',
  'remote.isTargetTitle': 'Current upload target folder',
  'remote.pending': '{n} folder(s) are waiting for ImageKit to index them (usually a few seconds). Retrying automatically.',
  'remote.emptyDirHint': 'This remote folder is empty. You can upload straight into ',
  'remote.groupFolders': 'Sub-folders',
  'remote.groupNote': 'Click to select as upload folder · double-click to open',
  'remote.groupFiles': 'Uploaded files',
  'remote.totalSize': '{size} total',
  'remote.privateBadge': 'Private file, signed access required',
  'remote.loadMore': 'Load more files',
  'remote.uploadToRoot': 'Upload to root',
  'remote.alreadyTarget': 'Already the upload folder',
  'remote.uploadHere': 'Upload to {path}',
  'remote.pickerTitle': 'Choose upload folder',
  'remote.pickerSubtitle': 'Browse existing ImageKit folders and select one as the target for this batch',
  'remote.pickerEmpty': 'No sub-folders here — you can use the current folder as the target',
  'remote.pickerSelected': 'Selected',
  'remote.pickerSelect': 'Select',
  'remote.pickerCurrent': 'Current: {path}',
  'remote.pickerSelectRoot': 'Select root',
  'remote.pickerSelectCurrent': 'Select current folder',

  /* ------------------------------ 提示条 ------------------------------ */
  'toast.dirsDropped': 'Dropped {n} folders — opened the first one',
  'toast.dirOpened': 'Opened folder: {path}',
  'toast.noUploadable': 'No uploadable files found',
  'toast.nothingToAdd': 'Nothing to add',
  'toast.added': 'Added {n} files to the queue',
  'toast.missingKeys': 'Public Key / Private Key not configured',
  'toast.fillCredentials': 'Fill in your ImageKit credentials under Settings first',
  'toast.uploaded': '{name} uploaded',
  'toast.uploadFailed': '{name}: {error}',
  'toast.noUploadsYet': 'No successful uploads yet',
  'toast.copiedLinks': 'Copied {n} links',
  'toast.copiedLabel': 'Copied {label} link',
  'toast.historyCleared': 'History cleared',
  'toast.configSaved': 'Settings saved',
  'toast.configReloaded': 'Config file reloaded',
  'toast.targetSet': 'Upload target set to {path}',
  'toast.folderCreated': 'Folder created: {path}',

  /* ------------------------------ 相对时间 ------------------------------ */
  'time.justNow': 'just now',
  'time.minutesAgo': '{n} min ago',
  'time.hoursAgo': '{n} h ago',
  'time.daysAgo': '{n} d ago',

  /* ------------------------------ 系统弹窗 ------------------------------ */
  'dialog.pickFiles': 'Choose files to upload',
  'dialog.mediaFiles': 'Media files',
  'dialog.allFiles': 'All files',
  'dialog.pickDirectory': 'Choose a folder to browse',
  'dialog.pickDirectoryButton': 'Choose folder',

  /* ------------------------------ 主进程错误 ------------------------------ */
  'error.absoluteOnly': 'Only absolute paths can be browsed',
  'error.notFound': 'Path not found: {path}',
  'error.noPermission': 'Permission denied: {path}',
  'error.notDirectory': 'That path is not a folder',
  'error.symlinkLoop': 'Symbolic link loop — cannot read this folder',
  'error.canceled': 'Canceled',
  'error.timeout': 'Request timed out. Check your network and try again.',
  'error.authFailed':
    'Authentication failed: the account could not be verified. Check the Private Key (no leading or trailing spaces).',
  'error.unauthorized': 'Authentication failed. Check that the Public Key and Private Key are correct.',
  'error.forbidden': 'Permission denied. Check the scope of the Private Key.',
  'error.requestFailed': 'Request failed (HTTP {status})',
  'error.missingPublicKey': 'Public Key is not configured. Fill it in under Settings.',
  'error.missingPrivateKey': 'Private Key is not configured. Fill it in under Settings.',
  'error.uploadNoFileId': 'Upload failed: the server did not return a fileId.',
  'error.folderNameEmpty': 'Folder name cannot be empty.',
  'error.folderNameSlash': 'Folder name cannot contain / or \\ .',
  'error.folderNameInvalid': 'Invalid folder name.',
  'error.tempWriteFailed': 'Failed to write the temporary file',
  'error.onlyHttp': 'Only http/https links can be opened',

  /* ------------------------------ 连通性测试 ------------------------------ */
  'test.success': 'Connected successfully, credentials are valid. ',
  'test.foldersFound': '{n} folders found at the root.',
  'test.noFolders': 'No sub-folders at the root yet — they will show up after you upload.',
  'test.endpoint': 'URL Endpoint: {url}',
  'test.noEndpoint': 'URL Endpoint is not set. Copy links manually after uploading.',

  /* ------------------------------ 配置文件注释头 ------------------------------ */
  'configFile.comment':
    'ImageKit Uploader configuration file. Edit and save it, then click "Reload config" in the app — no restart needed.',
  'configFile.fields':
    'name=display name | publicKey / privateKey = ImageKit API Keys | urlEndpoint = CDN endpoint | defaultFolder = default upload folder | apiEndpoint = management API base URL (leave empty for the official one)',
  'configFile.privateKeyWarning':
    'The Private Key is a sensitive credential. Never commit it to Git or share it with anyone.'
} as const

/** 全部文案键，由英文词典推导 */
export type MessageKey = keyof typeof en

/** 占位符参数 */
export type TranslateParams = Record<string, string | number>

/** 翻译函数 */
export type TranslateFn = (key: MessageKey, params?: TranslateParams) => string

const zh: Record<MessageKey, string> = {
  /* ------------------------------ 通用 ------------------------------ */
  'common.close': '关闭',
  'common.cancel': '取消',
  'common.refresh': '刷新',
  'common.up': '上级',
  'common.root': '根目录',
  'common.enter': '进入',
  'common.retry': '重试',
  'common.remove': '移除',
  'common.copyLink': '复制链接',
  'common.copyMarkdown': '复制 Markdown',
  'common.openInBrowser': '在浏览器打开',
  'common.deleteRecord': '删除记录',
  'common.loading': '读取中…',
  'common.loadingMore': '加载中…',
  'common.syncing': '同步中',
  'common.private': '私有',
  'common.back': '返回 {path}',
  'common.alreadyRoot': '已经是根目录',
  'common.newFolder': '新建目录',
  'common.newFolderPlaceholder': '新目录名，例如 banner',
  'common.creating': '创建中…',
  'common.create': '创建',
  'common.configure': '去配置',
  'common.copied': '已复制到剪贴板',
  'common.copyFailed': '复制失败，请手动复制',
  'common.copyFailedShort': '复制失败',

  /* ------------------------------ 主题 ------------------------------ */
  'theme.dark': '深色',
  'theme.light': '浅色',
  'theme.system': '跟随系统',
  'theme.tooltip': '主题：{theme}（点击切换）',

  /* ------------------------------ 语言 ------------------------------ */
  'language.label': '语言',
  'language.hint': '界面语言，会保存到配置文件',
  'language.tooltip': '界面语言：{language}',

  /* ------------------------------ 顶栏 / 全局 ------------------------------ */
  'app.subtitle': 'ImageKit 上传工具',
  'app.credentialsReady': '凭证已配置',
  'app.credentialsMissing': '待配置凭证',
  'app.settings': '设置',
  'app.banner': '还没有配置 ImageKit 凭证，上传前请先填写 Public Key 与 Private Key。',
  'app.configureNow': '立即配置',
  'app.tab.queue': '上传队列',
  'app.tab.history': '历史记录',
  'app.tab.local': '本地目录',
  'app.tab.remote': '云端目录',
  'app.tool.uploadAll': '全部上传',
  'app.tool.copyAllLinks': '复制全部链接',
  'app.tool.clearDone': '清除已完成',
  'app.foot.queue': '队列 {total}',
  'app.foot.waiting': ' · 等待 {n}',
  'app.foot.running': ' · 上传中 {n}',
  'app.foot.done': ' · 成功 {n}',
  'app.foot.failed': ' · 失败 {n}',
  'app.foot.uploaded': '本次已上传 {n} 个',
  'app.foot.configFile': '配置文件',

  /* ------------------------------ 拖拽区 ------------------------------ */
  'drop.reading': '正在读取文件…',
  'drop.title': '拖拽文件或文件夹到这里',
  'drop.hintPrefix': '或点击选择文件 · 支持 ',
  'drop.hintShortcut': '⌘/Ctrl + V',
  'drop.hintSuffix': ' 粘贴剪贴板图片',
  'drop.pickFile': '选择文件',
  'drop.pickFolder': '选择文件夹',

  /* ------------------------------ 上传参数 ------------------------------ */
  'opt.folder': '目录',
  'opt.browse': '浏览',
  'opt.browseTitle': '浏览 ImageKit 上的目录并选择上传目标',
  'opt.tags': '标签',
  'opt.tagsPlaceholder': '逗号分隔，如 封面,banner',
  'opt.unique': '唯一文件名',
  'opt.uniqueTitle': '同名文件自动追加随机后缀，避免覆盖',
  'opt.concurrency': '并发',
  'opt.concurrencyTitle': '同时上传的任务数',

  /* ------------------------------ 上传队列 ------------------------------ */
  'queue.status.pending': '等待中',
  'queue.status.uploading': '上传中',
  'queue.status.success': '已完成',
  'queue.status.error': '失败',
  'queue.status.canceled': '已取消',
  'queue.queuedNote': ' · 排队等待上传',
  'queue.uploadNow': '立即上传',
  'queue.cancelUpload': '取消上传',
  'queue.empty': '队列为空',
  'queue.emptyHint': '添加文件后会自动开始上传',

  /* ------------------------------ 历史记录 ------------------------------ */
  'history.empty': '暂无上传记录',
  'history.emptyHint': '成功上传的文件会保存在这里，最多 300 条',
  'history.count': '共 {n} 条记录',
  'history.clear': '清空记录',

  /* ------------------------------ 设置 ------------------------------ */
  'settings.title': '设置',
  'settings.subtitle': '凭证会写入本机配置文件，后期可直接编辑该文件调整',
  'settings.credentials': 'ImageKit 凭证',
  'settings.nameHint': '工具显示名称 / 账号标识',
  'settings.privateHint': '仅保存在本机，用于生成上传签名',
  'settings.urlHint': '用于拼接最终访问链接',
  'settings.show': '显示',
  'settings.hide': '隐藏',
  'settings.testing': '检测中…',
  'settings.saveAndTest': '保存并测试连接',
  'settings.defaults': '上传默认值',
  'settings.defaultFolder': '默认目录',
  'settings.defaultTags': '默认标签',
  'settings.tagsPlaceholder': '逗号分隔',
  'settings.concurrency': '并发上传数',
  'settings.customEndpoint': '自定义上传端点',
  'settings.customEndpointPlaceholder': '留空使用官方端点',
  'settings.apiEndpoint': '管理 API 地址',
  'settings.apiEndpointPlaceholder': '留空使用 https://api.imagekit.io/v1',
  'settings.uniqueDefault': '默认启用唯一文件名（避免同名覆盖）',
  'settings.appearance': '界面',
  'settings.configFile': '配置文件',
  'settings.configHint': '修改该文件并保存后，点击「重新加载配置」即可生效，无需重启。',
  'settings.openFile': '打开配置文件',
  'settings.reload': '重新加载配置',
  'settings.saving': '保存中…',
  'settings.save': '保存',

  /* ------------------------------ 本地目录浏览 ------------------------------ */
  'local.noFolder': '还没有选择目录',
  'local.noFolderHint': '选一个本地目录，就能列出里面的子目录和文件',
  'local.pickFolder': '选择目录',
  'local.showHidden': '显示隐藏文件',
  'local.groupDirs': '目录',
  'local.groupFiles': '文件',
  'local.truncated': '目录条目过多，仅显示前 {shown} 项（共 {total} 项）',
  'local.emptyDir': '这个目录是空的',
  'local.symlink': '软链接',
  'local.includeSub': '包含子目录',
  'local.includeSubTitle': '「添加当前目录文件」时是否一并包含子目录里的文件',
  'local.selectAll': '全选文件 ({n})',
  'local.deselectAll': '取消全选',
  'local.clearSelection': '清空选择',
  'local.addCurrent': '添加当前目录文件',
  'local.addRecursive': '添加（含子目录）文件',
  'local.addSelected': '添加选中',

  /* ------------------------------ 云端目录浏览 ------------------------------ */
  'remote.needConfig': '需要先配置 ImageKit 凭证',
  'remote.needConfigHint': '填写 Public Key 与 Private Key 后，才能读取云端目录与文件',
  'remote.notOpened': '还没有打开云端目录',
  'remote.loadFailed': '读取云端目录失败',
  'remote.introHint': '读取 ImageKit 上已有的目录和文件，并选择上传到哪个目录',
  'remote.openRoot': '打开根目录',
  'remote.targetValue': '上传目标：{path}',
  'remote.targetTitle': '上传目标目录：{path}',
  'remote.rowTitle': '单击：把 {path} 设为上传目录 · 双击：进入该目录',
  'remote.rowOpenTitle': '进入 {path}',
  'remote.indexBadge': 'ImageKit 目录索引有延迟，稍后会自动同步',
  'remote.isTarget': '上传目标',
  'remote.isTargetTitle': '当前上传目标目录',
  'remote.pending': '有 {n} 个目录正在等待 ImageKit 建立索引（通常几秒），已自动重试刷新。',
  'remote.emptyDirHint': '这个云端目录是空的。可以直接把文件上传到 ',
  'remote.groupFolders': '子目录',
  'remote.groupNote': '单击选中为上传目录 · 双击进入',
  'remote.groupFiles': '已上传文件',
  'remote.totalSize': '共 {size}',
  'remote.privateBadge': '私有文件，访问需要签名',
  'remote.loadMore': '加载更多文件',
  'remote.uploadToRoot': '上传到根目录',
  'remote.alreadyTarget': '当前就是上传目录',
  'remote.uploadHere': '上传到 {path}',
  'remote.pickerTitle': '选择上传目录',
  'remote.pickerSubtitle': '浏览 ImageKit 上已有的目录，选中后作为本次上传的目标目录',
  'remote.pickerEmpty': '这个目录下没有子目录，可以直接把当前目录作为上传目标',
  'remote.pickerSelected': '已选',
  'remote.pickerSelect': '选中',
  'remote.pickerCurrent': '当前位置：{path}',
  'remote.pickerSelectRoot': '选根目录',
  'remote.pickerSelectCurrent': '选中当前目录',

  /* ------------------------------ 提示条 ------------------------------ */
  'toast.dirsDropped': '一次拖入了 {n} 个目录，已打开第一个',
  'toast.dirOpened': '已打开目录：{path}',
  'toast.noUploadable': '没有识别到可上传的文件',
  'toast.nothingToAdd': '没有可添加的文件',
  'toast.added': '已添加 {n} 个文件到队列',
  'toast.missingKeys': '未配置 Public Key / Private Key',
  'toast.fillCredentials': '请先在「设置」中填写 ImageKit 凭证',
  'toast.uploaded': '{name} 上传成功',
  'toast.uploadFailed': '{name}：{error}',
  'toast.noUploadsYet': '还没有上传成功的文件',
  'toast.copiedLinks': '已复制 {n} 条链接',
  'toast.copiedLabel': '已复制 {label} 链接',
  'toast.historyCleared': '已清空历史记录',
  'toast.configSaved': '配置已保存',
  'toast.configReloaded': '已重新加载配置文件',
  'toast.targetSet': '上传目标目录已设为 {path}',
  'toast.folderCreated': '已创建目录 {path}',

  /* ------------------------------ 相对时间 ------------------------------ */
  'time.justNow': '刚刚',
  'time.minutesAgo': '{n} 分钟前',
  'time.hoursAgo': '{n} 小时前',
  'time.daysAgo': '{n} 天前',

  /* ------------------------------ 系统弹窗 ------------------------------ */
  'dialog.pickFiles': '选择要上传的文件',
  'dialog.mediaFiles': '媒体文件',
  'dialog.allFiles': '全部文件',
  'dialog.pickDirectory': '选择要浏览的目录',
  'dialog.pickDirectoryButton': '选择目录',

  /* ------------------------------ 主进程错误 ------------------------------ */
  'error.absoluteOnly': '只能浏览绝对路径',
  'error.notFound': '路径不存在：{path}',
  'error.noPermission': '没有权限访问：{path}',
  'error.notDirectory': '该路径不是目录',
  'error.symlinkLoop': '软链接循环，无法读取该目录',
  'error.canceled': '已取消',
  'error.timeout': '请求超时，请检查网络后重试。',
  'error.authFailed':
    '鉴权失败：账号无法通过验证，请检查 Private Key 是否填写正确（注意首尾不要有多余空格）。',
  'error.unauthorized': '鉴权失败，请检查 Public Key / Private Key 是否正确。',
  'error.forbidden': '没有权限，请检查 Private Key 的权限范围。',
  'error.requestFailed': '请求失败（HTTP {status}）',
  'error.missingPublicKey': '未配置 Public Key，请在「设置」中填写。',
  'error.missingPrivateKey': '未配置 Private Key，请在「设置」中填写。',
  'error.uploadNoFileId': '上传失败：服务端未返回 fileId。',
  'error.folderNameEmpty': '目录名不能为空。',
  'error.folderNameSlash': '目录名不能包含 / 或 \\ 。',
  'error.folderNameInvalid': '目录名不合法。',
  'error.tempWriteFailed': '临时文件写入失败',
  'error.onlyHttp': '仅支持打开 http/https 链接',

  /* ------------------------------ 连通性测试 ------------------------------ */
  'test.success': '连接成功，凭证有效。',
  'test.foldersFound': '根目录下已发现 {n} 个目录。',
  'test.noFolders': '根目录下暂时没有子目录，上传后即可看到。',
  'test.endpoint': 'URL Endpoint：{url}',
  'test.noEndpoint': '尚未填写 URL Endpoint，上传后请手动复制链接。',

  /* ------------------------------ 配置文件注释头 ------------------------------ */
  'configFile.comment':
    'ImageKit 上传工具配置文件。修改后保存，回到应用点击「重新加载配置」即可生效，无需重启。',
  'configFile.fields':
    'name=工具显示名 | publicKey / privateKey = ImageKit API Keys | urlEndpoint = CDN 地址 | defaultFolder = 默认上传目录 | apiEndpoint = 管理 API 地址（留空用官方）',
  'configFile.privateKeyWarning': 'Private Key 为敏感凭证，请勿提交到 Git 或分享给他人。'
}

const DICTIONARIES: Record<Language, Record<MessageKey, string>> = { en, zh }

/** 把任意输入规整成受支持的语言 */
export function normalizeLanguage(value: unknown): Language {
  const raw = String(value ?? '')
    .trim()
    .toLowerCase()
  if (raw === 'zh' || raw.startsWith('zh-')) return 'zh'
  if (raw === 'en' || raw.startsWith('en-')) return 'en'
  return DEFAULT_LANGUAGE
}

/** 取语言对应的排序 locale */
export function localeOf(lang: Language): string {
  return lang === 'zh' ? 'zh-CN' : 'en'
}

/** 翻译：找不到键时回退到英文原文，再回退到键名本身 */
export function translate(lang: Language, key: MessageKey, params?: TranslateParams): string {
  const dict = DICTIONARIES[lang] ?? DICTIONARIES[DEFAULT_LANGUAGE]
  let text = dict[key] ?? en[key] ?? key
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.split(`{${name}}`).join(String(value))
    }
  }
  return text
}

/** 绑定语言，返回可直接调用的翻译函数 */
export function createTranslator(lang: Language): TranslateFn {
  return (key, params) => translate(lang, key, params)
}

/**
 * 判断一条错误信息是否来自「用户主动取消」。
 *
 * 取消是主进程抛出的错误，文案会随界面语言变化，因此不能直接比对某一种语言的字符串。
 * 这里对所有支持语言的文案都做一次匹配，保证渲染层判断与语言无关。
 */
export function isCanceledMessage(message: unknown): boolean {
  const needle = String(message ?? '').trim()
  if (!needle) return false
  return (Object.keys(DICTIONARIES) as Language[]).some((lang) =>
    needle.includes(translate(lang, 'error.canceled'))
  )
}
