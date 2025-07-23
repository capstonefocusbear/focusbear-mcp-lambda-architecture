# 🚀 Connecting to AWS Bastion Host from Windows using PuTTY

---

## 📌 Purpose

This guide helps **Windows users securely SSH into an AWS Bastion Host using PuTTY** to:

✅ Access private AWS resources (e.g., RDS Postgres).\
✅ Maintain **zero public exposure on databases**.

---

## 🛠️ Prerequisites

✅ AWS Bastion Host deployed in your VPC.\
✅ Bastion’s **public IP address or DNS**.\
✅ SSH private key (`.pem` file) **stored securely** (downloaded from Secrets Manager if needed).\
✅ PuTTY and PuTTYgen installed.

---

## 1️⃣ Install PuTTY & PuTTYgen

- Download from [https://www.putty.org](https://www.putty.org).
- Install both PuTTY and PuTTYgen on your Windows system.

---

## 2️⃣ Convert `.pem` to `.ppk` using PuTTYgen

1. Open **PuTTYgen**.
2. Click **Load**.
   - Set file type to **All Files (\*\*\***.**\***)\*\*.
   - Select your `bastion-key.pem`.
3. Click **Save private key**.
   - Ignore passphrase prompt if not needed.
   - Save as `bastion-key.ppk`.

---

## 3️⃣ Configure PuTTY for SSH Connection

### A. Session

- **Host Name:** `<bastion-public-ip>`
- **Port:** `22`
- **Connection type:** SSH

---

### B. SSH Authentication

1. Go to:
   ```
   Connection > SSH > Auth
   ```
2. Click **Browse** and select your `bastion-key.ppk`.

---

### C. (Optional) Save Session

- Go back to **Session** (top).
- Enter a name in **Saved Sessions** (e.g., `BastionSSH`).
- Click **Save** for quick reuse.

---

## 4️⃣ Configure SSH Tunnel (Optional, for DB access)

If you need to access a **private RDS Postgres via the Bastion**:

1. Go to:
   ```
   Connection > SSH > Tunnels
   ```
2. Under **Add new forwarded port:**
   - **Source Port:** `5432`
   - **Destination:** `<rds-endpoint>:5432`
3. Click **Add**.
   - You will see:
     ```
     L5432    <rds-endpoint>:5432
     ```

This forwards your `localhost:5432` to your private RDS via the Bastion.

---

## 5️⃣ Connect

1. Click **Open**.
2. If prompted:
   ```
   login as:
   ```
   enter:
   ```
   ec2-user
   ```
   (or `ubuntu`, `centos`, depending on your AMI).

✅ If your key is correct, you will log in without a password prompt.

---

## 6️⃣ Verifying Tunnel (Optional)

To ensure the tunnel for Postgres is active:

Open PowerShell:

```powershell
Test-NetConnection localhost -Port 5432
```

✅ If it shows:

```
TcpTestSucceeded : True
```

your tunnel is active.

---

## 7️⃣ Using pgAdmin with the Tunnel

In **pgAdmin 4**:

- **Host:** `localhost`
- **Port:** `5432`
- **Username:** your Postgres user (e.g., `postgres`)
- **Password:** your DB password
- **Database:** your DB name

✅ You can now access your **private AWS RDS securely**.

---

## 🚩 Security Notes

✅ Do **not share your private key**.\
✅ Avoid keeping the Bastion SSH open to `0.0.0.0/0`; restrict it to your IP.\
✅ Close your PuTTY session when not in use.\
✅ Rotate your keys periodically.

---
