import { Route, Routes } from "react-router";
import { useConexao } from "./agente/conexao.tsx";
import { Layout } from "./layout/Layout.tsx";
import { Adicionar } from "./telas/Adicionar.tsx";
import { Aplicar } from "./telas/Aplicar.tsx";
import { Conectar } from "./telas/Conectar.tsx";
import { Curriculo } from "./telas/Curriculo.tsx";
import { Falhas } from "./telas/Falhas.tsx";
import { Importar } from "./telas/Importar.tsx";
import { Inicio } from "./telas/Inicio.tsx";
import { Perfil } from "./telas/Perfil.tsx";
import { Preparar } from "./telas/Preparar.tsx";
import { Vagas } from "./telas/Vagas.tsx";

/** Rotas do app; sem agente pareado, só a tela de conexão. */
export function App() {
  const { fase } = useConexao();
  if (fase !== "pronto") return <Conectar />;
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Inicio />} />
        <Route path="vagas" element={<Vagas />} />
        <Route path="vagas/adicionar" element={<Adicionar />} />
        <Route path="preparar" element={<Preparar />} />
        <Route path="aplicar" element={<Aplicar />} />
        <Route path="curriculo" element={<Curriculo />} />
        <Route path="curriculo/importar" element={<Importar />} />
        <Route path="curriculo/perfil" element={<Perfil />} />
        <Route path="falhas" element={<Falhas />} />
        <Route path="*" element={<Inicio />} />
      </Route>
    </Routes>
  );
}
