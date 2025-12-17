import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'

export interface MentionListProps {
  items: string[]
  command: (props: { id: string; label: string }) => void
  loading?: boolean
}

export interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

export const MentionList = forwardRef<MentionListRef, MentionListProps>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const selectItem = (index: number) => {
    const item = props.items[index]
    if (item) {
      props.command({ id: item, label: item })
    }
  }

  const upHandler = () => {
    setSelectedIndex(((selectedIndex + props.items.length) - 1) % props.items.length)
  }

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length)
  }

  const enterHandler = () => {
    selectItem(selectedIndex)
  }

  useEffect(() => {
    setSelectedIndex(0)
  }, [props.items])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (props.loading) return false

      if (event.key === 'ArrowUp') {
        upHandler()
        return true
      }

      if (event.key === 'ArrowDown') {
        downHandler()
        return true
      }

      if (event.key === 'Enter') {
        enterHandler()
        return true
      }

      return false
    },
  }))

  if (props.loading) {
    return (
      <div className="mention-dropdown">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="mention-item skeleton">
            <div className="skeleton-text"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="mention-dropdown">
      {props.items.length ? (
        props.items.map((item, index) => (
          <button
            className={`mention-item ${index === selectedIndex ? 'is-selected' : ''}`}
            key={index}
            onClick={() => selectItem(index)}
          >
            {item}
          </button>
        ))
      ) : (
        <div className="mention-item is-empty">No result</div>
      )}
    </div>
  )
})

MentionList.displayName = 'MentionList'

