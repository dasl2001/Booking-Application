"use client";
import { useState } from "react";
import { api } from "@/lib/api";

export default function LoginPage() {
  const [email,setEmail] = useState(""); const [password,setPassword] = useState(""); const [msg,setMsg] = useState("");
  return (
    <main className="max-w-sm mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Logga in</h1>
      <form className="space-y-3" onSubmit={async e=>{
        e.preventDefault(); setMsg("");
        try{
          const d = await api<{session:{access_token:string}}>("/api/auth/login",{method:"POST", body:JSON.stringify({email,password})});
          localStorage.setItem("access_token", d.session.access_token);
          location.href = "/";
        }catch(e:any){ setMsg(e.message); }
      }}>
        <input className="border rounded px-3 py-2 w-full" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required />
        <input className="border rounded px-3 py-2 w-full" type="password" placeholder="Lösenord" value={password} onChange={e=>setPassword(e.target.value)} required />
        <button className="px-3 py-2 rounded-full bg-rose-600 text-white w-full">Logga in</button>
        <p className="text-sm">Ny här? <a className="underline" href="/register">Skapa konto</a></p>
        <p className="text-sm text-rose-600">{msg}</p>
      </form>
    </main>
  );
}
