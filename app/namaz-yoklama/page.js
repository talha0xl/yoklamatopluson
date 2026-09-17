import Kabuk from "../../components/Kabuk";
import NamazYoklamaIstemci from "./NamazYoklamaIstemci";

export default function NamazYoklamaSayfasi() {
  return (
    <Kabuk aktif="/namaz-yoklama">
      <NamazYoklamaIstemci />
    </Kabuk>
  );
}
