import { useMemo, useState } from 'react'
import type { AppApi } from '../state/useVaultApp'
import { findDuplicateGroups, type DuplicateGroup } from '../vault/dedupe'
import { CopyIcon, XIcon } from './icons'

export function DedupeDialog({ app, onClose }: { app: AppApi; onClose: () => void }) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  const session = app.session

  const groups = useMemo(
    () => (session ? findDuplicateGroups(app.items, session.data.blobs) : []),
    [app.items, session],
  )

  const existingIds = useMemo(() => new Set(app.items.map((item) => item.id)), [app.items])
  const checkedIds = [...selected].filter((id) => existingIds.has(id))
  const duplicateCount = groups.reduce((total, group) => total + group.items.length, 0)

  const folderName = (folderId: string | null) =>
    app.folders.find((folder) => folder.id === folderId)?.name ?? '未分组'

  const toggle = (id: string) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const checkRest = (group: DuplicateGroup) => {
    setSelected((current) => {
      const next = new Set(current)
      for (const item of group.items.slice(1)) next.add(item.id)
      return next
    })
  }

  const checkAllRest = () => {
    setSelected((current) => {
      const next = new Set(current)
      for (const group of groups) {
        for (const item of group.items.slice(1)) next.add(item.id)
      }
      return next
    })
  }

  const remove = () => {
    if (checkedIds.length === 0) return
    app.deleteItems(checkedIds)
    setSelected(new Set())
    app.showNotice(`已删除 ${checkedIds.length} 个条目，导出后生效`)
  }

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-panel dedupe-panel" onClick={(event) => event.stopPropagation()}>
        <div className="panel-head">
          <div>
            <h2>去重</h2>
            <p>
              名称、描述、字段（字段名、类型、值、附件内容）完全相同才归为一组，字段顺序也要一致；文件夹不参与比较。
            </p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="关闭">
            <XIcon size={17} />
          </button>
        </div>

        <div className="dedupe-body">
          {groups.length === 0 ? (
            <div className="dedupe-empty">
              <CopyIcon size={22} />
              <span>没有发现重复条目</span>
            </div>
          ) : (
            <>
              <p className="dedupe-summary">
                共 {app.items.length} 个条目，发现 {groups.length} 组重复，涉及 {duplicateCount} 个条目。
              </p>
              {groups.map((group, index) => (
                <section className="dedupe-group" key={group.id}>
                  <div className="dedupe-group-head">
                    <span>
                      第 {index + 1} 组 · {group.items.length} 个完全相同的条目
                    </span>
                    <button className="button small ghost" onClick={() => checkRest(group)}>
                      勾选其余
                    </button>
                  </div>
                  <div className="dedupe-group-body">
                    {group.items.map((item) => (
                      <label className="dedupe-item" key={item.id}>
                        <input
                          type="checkbox"
                          checked={selected.has(item.id)}
                          onChange={() => toggle(item.id)}
                        />
                        <span className="dedupe-item-name">{item.name || '未命名条目'}</span>
                        <span className="dedupe-item-meta">
                          {folderName(item.folderId)} · {item.fields.length} 个字段
                        </span>
                      </label>
                    ))}
                  </div>
                </section>
              ))}
            </>
          )}
        </div>

        <div className="dialog-actions dedupe-actions">
          <button
            className="button small ghost"
            onClick={checkAllRest}
            disabled={groups.length === 0}
          >
            勾选每组其余条目（保留第一条）
          </button>
          <div className="dedupe-action-buttons">
            <button className="button ghost" onClick={onClose}>
              关闭
            </button>
            <button
              className="button danger"
              onClick={remove}
              disabled={checkedIds.length === 0}
            >
              删除所选（{checkedIds.length}）
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
