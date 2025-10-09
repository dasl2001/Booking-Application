"use client";
import { useState } from "react";
import { api } from "@/lib/api";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [msg,setMsg] = useState("");
  const [loading,setLoading] = useState(false);

  return (
    <main className="max-w-sm mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Skapa konto</h1>
      <form
        className="space-y-3"
        onSubmit={async e=>{
          e.preventDefault();
          setMsg(""); setLoading(true);
          try{
            await api("/api/auth/register", {
              method:"POST",
              body: JSON.stringify({ name, email, password }),
            });
            setMsg("Konto skapat! Du skickas till inloggning…");
            setName(""); setEmail(""); setPassword("");
            setTimeout(()=> location.href="/login", 800);
          }catch(e:any){
            setMsg(e.message);
          }finally{
            setLoading(false);
          }
        }}
      >
        <input className="border rounded px-3 py-2 w-full" placeholder="Namn" value={name} onChange={e=>setName(e.target.value)} required />
        <input className="border rounded px-3 py-2 w-full" type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required />
        <input className="border rounded px-3 py-2 w-full" type="password" placeholder="Lösenord (min 6 tecken)" value={password} onChange={e=>setPassword(e.target.value)} required />
        <button disabled={loading} className="px-3 py-2 rounded-full bg-rose-600 text-white w-full">
          {loading ? "Skapar..." : "Registrera"}
        </button>
        <p className="text-sm text-rose-600">{msg}</p>
      </form>
    </main>
  );
}
