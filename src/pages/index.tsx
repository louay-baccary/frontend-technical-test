import type { ReactElement } from 'react'
import Head from 'next/head'
import { AppShell, useSelectedConversationId } from '../components/Layout/AppShell'
import { ConversationList } from '../components/ConversationList/ConversationList'
import { MessageThread } from '../components/MessageThread/MessageThread'
import { MessageComposer } from '../components/MessageComposer/MessageComposer'
import { useTranslations } from '../i18n/useTranslations'

export default function Home(): ReactElement {
  const t = useTranslations()
  const selectedConversationId = useSelectedConversationId()

  return (
    <>
      <Head>
        <title>{t('appShell.title')}</title>
        <meta name="description" content="Frontend exercise for developpers who want to join us on leboncoin.fr" />
      </Head>

      <AppShell
        conversationList={<ConversationList />}
        messageThread={
          <>
            <MessageThread />
            <MessageComposer key={selectedConversationId ?? 'none'} />
          </>
        }
      />
    </>
  )
}
