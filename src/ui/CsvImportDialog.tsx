import { useState } from 'react'
import type { AppApi } from '../state/useVaultApp'
import { parseKeepassCsv, type CsvFormat, type ParsedCsvImport } from '../vault/keepassCsv'
import { formatSize } from './FieldRow'
import { UploadIcon, XIcon } from './icons'

const FORMAT_LABEL: Record<CsvFormat, string> = {
  keepassxc: 'KeePassXC CSV',
  keepass1: 'KeePass 1.x CSV',
  generic: '通用 CSV',
}

export function CsvImportDialog({ app, onClose }: { app: AppApi; onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [parsed, setParsed] = useState<ParsedCsvImport | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = async (next: File) => {
    setFile(next)
    setParsed(null)
    setError(null)
    try {
      const text = await next.text()
      setParsed(parseKeepassCsv(text))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    }
  }

  const submit = () => {
    if (!parsed) return
    const newFolders = parsed.folders.filter(
      (name) => !app.folders.some((folder) => folder.name === name),
    ).length
    app.importCsv(parsed)
    app.showNotice(`已导入 ${parsed.entries.length} 个条目，新建 ${newFolders} 个文件夹`)
    onClose()
  }

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-panel import-panel" onClick={(event) => event.stopPropagation()}>
        <div className="panel-head">
          <div>
            <h2>导入 KeePass CSV</h2>
            <p>支持 KeePassXC 与 KeePass 1.x / 2.x 的 CSV 导出，导入到当前库。</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="关闭">
            <XIcon size={17} />
          </button>
        </div>

        <div className="import-body">
          <label className="file-picker">
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => {
                const next = event.target.files?.[0]
                event.target.value = ''
                if (next) void load(next)
              }}
            />
            <span className="file-picker-icon">
              <UploadIcon size={18} />
            </span>
            <span className="file-picker-text">
              <strong>{file ? file.name : '选择一个 .csv 文件'}</strong>
              <span>{file ? formatSize(file.size) : '点击选择文件'}</span>
            </span>
          </label>

          {error && <p className="form-error">{error}</p>}

          {parsed && (
            <div className="import-preview">
              <div className="import-format">
                <span className="badge info">{FORMAT_LABEL[parsed.format]}</span>
                <span className="import-summary">
                  {parsed.entries.length} 个条目 · {parsed.folders.length} 个文件夹
                </span>
              </div>

              <div className="import-columns">
                <span className="import-label">识别到的列</span>
                <div className="chips">
                  {parsed.columns.map((column, index) => (
                    <span className="chip" key={index}>
                      {column || '（空列名）'}
                    </span>
                  ))}
                </div>
              </div>

              {parsed.ignoredColumns.length > 0 && (
                <p className="import-note">
                  忽略的列：{parsed.ignoredColumns.join('、')}
                </p>
              )}
              <p className="import-note">空单元格不会创建字段；分组路径原样作为文件夹名。</p>
              <p className="import-note">不查重：同一个文件导入两次会产生重复条目。</p>
              <p className="import-note">导入后会切换到「全部条目」。</p>
              <p className="import-note warning">CSV 是明文，导入后请删除原文件。</p>
            </div>
          )}
        </div>

        <div className="dialog-actions">
          <button className="button ghost" onClick={onClose}>
            取消
          </button>
          <button
            className="button primary"
            onClick={submit}
            disabled={!parsed || parsed.entries.length === 0}
          >
            导入到当前库
          </button>
        </div>
      </div>
    </div>
  )
}
