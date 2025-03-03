---
sidebar_position: 5
---

# 🌐 NEAR Social Plugin

The NEAR Social plugin enables distribution of curated content to [NEAR Social](https://near.social), a decentralized social network built on the NEAR Protocol.

## 🔧 Setup Guide

1. Create a NEAR account if you don't already have one. You can create an account on [NEAR Wallet](https://wallet.near.org/) or [MyNearWallet](https://app.mynearwallet.com/).

   :::note
   You'll need a NEAR account with sufficient funds to cover transaction fees for posting content to NEAR Social.
   :::

2. Generate a private key for your account. This can be done through the [NEAR CLI](https://github.com/near/near-cli-rs) or through wallet interfaces that support key export.

3. Modify your `curate.config.json` to include the NEAR Social configuration:

   ```json
   {
     "outputs": {
       "stream": {
         "enabled": true,
         "distribute": [
           {
             "plugin": "@curatedotfun/near-social",
             "config": {
               "accountId": "account.near",
               "privateKey": "{ACCOUNT_PRIVATE_KEY}",
               "networkId": "mainnet"
             }
           }
         ]
       }
     }
   }
   ```

   The container is already set up to hydrate environment variables into the configuration at runtime, replacing `{ACCOUNT_PRIVATE_KEY}` with the values from the environment.

   You need to specify:
   - `accountId`: Your NEAR account ID (e.g., example.near)
   - `privateKey`: The private key for your NEAR account
   - `networkId`: (Optional) The NEAR network to use, either "mainnet" or "testnet". Defaults to "mainnet" if not specified.

   :::caution
   Keep your private key secure! Never commit it directly to your configuration files or repositories.
   :::

4. Enable the stream by setting `"enabled": true` if not already enabled.

   Once merged, your approved messages will start flowing to NEAR Social through your configured account.

   :::tip
   If your stream had been disabled and you have existing, approved curations, call `/api/feeds/:feedId/process` to process them.
   :::

## 📝 Configuration Reference

Full configuration options for the NEAR Social plugin:

```json
{
  "plugin": "@curatedotfun/near-social",
  "config": {
    "accountId": "account.near",
    "privateKey": "{ACCOUNT_PRIVATE_KEY}", // Automatically injected from environment
    "networkId": "mainnet" // Optional: "mainnet" or "testnet", defaults to "mainnet"
  }
}
```

## 🔐 Security Considerations

- The NEAR Social plugin requires a private key to sign transactions. This key should be stored securely as an environment variable.
- Consider using a dedicated NEAR account for distribution purposes rather than your main account.
- Monitor your account's activity regularly to ensure it's being used as expected.
- Set appropriate gas limits for your transactions to control costs.
