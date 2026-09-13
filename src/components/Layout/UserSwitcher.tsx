import type { ReactElement } from 'react'
import { useUsers } from '../../hooks/useUsers'
import { useCurrentUser } from '../../context/CurrentUserContext'
import { useTranslations } from '../../i18n/useTranslations'
import styles from './AppShell.module.css'

export function UserSwitcher(): ReactElement {
  const { data: users } = useUsers()
  const { currentUserId, setCurrentUserId } = useCurrentUser()
  const t = useTranslations()

  return (
    <label className={styles.userSwitcher}>
      <span className={styles.srOnly}>{t('appShell.viewingAs')}</span>
      <select
        value={currentUserId}
        onChange={(event) => setCurrentUserId(Number(event.target.value))}
        className={styles.userSelect}
      >
        {(users ?? []).map((user) => (
          <option key={user.id} value={user.id}>
            {user.nickname}
          </option>
        ))}
      </select>
    </label>
  )
}
