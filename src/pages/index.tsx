import type { ReactElement } from 'react'
import Head from 'next/head'
import { AppShell } from '../components/Layout/AppShell'
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
        conversationList={<p>{t('common.comingSoon')}</p>}
        messageThread={<p>{t('common.comingSoon')}</p>}
      />
    </>
  )
}
