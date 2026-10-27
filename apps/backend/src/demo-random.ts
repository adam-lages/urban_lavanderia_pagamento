export type Rand = () => number;

export function mulberry32(seed: number): Rand {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pick = <T>(rand: Rand, list: readonly T[]) => list[Math.floor(rand() * list.length)]!;
export const between = (rand: Rand, min: number, max: number) => min + Math.floor(rand() * (max - min + 1));

export function weighted<T>(rand: Rand, options: ReadonlyArray<readonly [T, number]>) {
  const total = options.reduce((s, o) => s + o[1], 0);
  let r = rand() * total;
  for (const [value, weight] of options) {
    r -= weight;
    if (r < 0) return value;
  }
  return options[options.length - 1]![0];
}

const FIRST = [
  "Ana", "Bruno", "Carla", "Daniel", "Elisa", "Fábio", "Gabriela", "Hugo", "Isabela", "João", "Karina", "Lucas",
  "Mariana", "Nicolas", "Olívia", "Pedro", "Quésia", "Rafael", "Sofia", "Thiago", "Valéria", "Wesley", "Yasmin",
  "Alice", "Bernardo", "Camila", "Davi", "Eduarda", "Felipe", "Giovana", "Henrique", "Larissa", "Matheus", "Natália",
  "Otávio", "Paula", "Renato", "Sabrina", "Tiago", "Vitória",
];
const LAST = [
  "Silva", "Souza", "Oliveira", "Santos", "Lima", "Pereira", "Costa", "Rodrigues", "Almeida", "Nascimento",
  "Carvalho", "Araújo", "Ribeiro", "Martins", "Barbosa", "Gomes", "Cavalcanti", "Moura", "Freitas", "Rocha",
  "Mendes", "Teixeira", "Correia", "Monteiro", "Dias", "Pinto", "Castro", "Campos", "Nogueira", "Melo",
];

const plain = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function checkDigit(digits: number[]) {
  const weight = digits.length + 1;
  const sum = digits.reduce((s, d, i) => s + d * (weight - i), 0);
  return ((sum * 10) % 11) % 10;
}

export function randomCpf(rand: Rand) {
  const base = Array.from({ length: 9 }, () => Math.floor(rand() * 10));
  const d1 = checkDigit(base);
  const d2 = checkDigit([...base, d1]);
  return [...base, d1, d2].join("");
}

export interface DemoCustomer {
  id: string;
  name: string;
  birthDate: string;
  cpf: string;
  email: string;
  phone: string;
  createdAt: string;
}

export function randomCustomers(rand: Rand, count: number, usedCpfs: Set<string>, from: Date, to: Date): DemoCustomer[] {
  const out: DemoCustomer[] = [];
  for (let i = 0; i < count; i++) {
    const first = pick(rand, FIRST);
    const last = pick(rand, LAST);
    let cpf = randomCpf(rand);
    while (usedCpfs.has(cpf) || /^(\d)\1{10}$/.test(cpf)) cpf = randomCpf(rand);
    usedCpfs.add(cpf);
    const year = between(rand, 1962, 2006);
    const birth = new Date(Date.UTC(year, between(rand, 0, 11), between(rand, 1, 28)));
    const created = new Date(from.getTime() + rand() * (to.getTime() - from.getTime()));
    out.push({
      id: `cli-demo-${String(i + 1).padStart(3, "0")}`,
      name: `${first} ${last}`,
      birthDate: birth.toISOString().slice(0, 10),
      cpf,
      email: `${plain(first)}.${plain(last)}${between(rand, 1, 999)}@email.com`,
      phone: `55819${between(rand, 80000000, 99999999)}`,
      createdAt: created.toISOString(),
    });
  }
  return out;
}
