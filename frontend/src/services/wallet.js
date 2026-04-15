/**
 * services/wallet.js — Pera Wallet connect, disconnect, sign
 */

import { Buffer } from 'buffer';
if (typeof window !== 'undefined') {
  window.Buffer = Buffer;
}

let _pera = null;

async function getPera() {
  if (!_pera) {
    const { PeraWalletConnect } = await import('@perawallet/connect');
    _pera = new PeraWalletConnect({ shouldShowSignTxnToast: true });
  }
  return _pera;
}

export async function connectWallet() {
  const pera = await getPera();
  try {
    const accounts = await pera.connect();
    return accounts[0];
  } catch (err) {
    if (err?.data?.type !== 'CONNECT_MODAL_CLOSED') {
      console.error('Wallet connect error:', err);
    }
    return null;
  }
}

export async function disconnectWallet() {
  const pera = await getPera();
  try {
    await pera.disconnect();
  } catch (err) {
    console.error('Wallet disconnect error:', err);
  }
}

export async function reconnectWallet(onConnect) {
  const pera = await getPera();
  try {
    const accounts = await pera.reconnectSession();
    if (accounts.length > 0) {
      onConnect(accounts[0]);
    }
  } catch (err) {
    // No previous session — ignore
  }
}

export async function signTransaction(base64UnsignedTxn) {
  const pera = await getPera();
  const algosdk = await import('algosdk');
  const txnBytes = Buffer.from(base64UnsignedTxn, 'base64');
  const txn = algosdk.decodeUnsignedTransaction(txnBytes);
  const signed = await pera.signTransaction([[{ txn }]]);
  return Buffer.from(signed[0]).toString('base64');
}

export async function signTransactionGroup(base64Txns) {
  const pera = await getPera();
  const algosdk = await import('algosdk');
  const txnGroup = base64Txns.map((b64) => {
    const txn = algosdk.decodeUnsignedTransaction(Buffer.from(b64, 'base64'));
    return { txn };
  });
  const signed = await pera.signTransaction([txnGroup]);
  return signed.map((s) => Buffer.from(s).toString('base64'));
}
