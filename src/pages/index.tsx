import type { ReactElement } from 'react'
import Head from 'next/head'
import { AppShell } from '../components/Layout/AppShell'
import { ConversationList } from '../components/ConversationList/ConversationList'
import { MessageThread } from '../components/MessageThread/MessageThread'
import { useTranslations } from '../i18n/useTranslations'

export default function Home(): ReactElement {
  const t = useTranslations()

  return (
    <>
      <Head>
        <title>{t('appShell.title')}</title>
        <meta name="description" content="Frontend exercise for developpers who want to join us on leboncoin.fr" />
      </Head>

      <AppShell
        conversationList={<ConversationList />}
        messageThread={<MessageThread />}
      />
    </>
  )
}
