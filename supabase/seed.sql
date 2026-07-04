-- Seed de exemplo — dados fictícios só para desenvolver/testar o fluxo antes do
-- conteúdo real do salão entrar (ver "Pendências" no CLAUDE.md).

update salao_configuracoes set
  nome_salao = 'Studio Áurea',
  telefone = '(11) 4002-8922',
  endereco = 'Rua das Palmeiras, 482 — Jardins, São Paulo/SP',
  instagram = '@studioaurea',
  horario_funcionamento = '{
    "1": {"abre": "09:00", "fecha": "19:00"},
    "2": {"abre": "09:00", "fecha": "19:00"},
    "3": {"abre": "09:00", "fecha": "19:00"},
    "4": {"abre": "09:00", "fecha": "19:00"},
    "5": {"abre": "09:00", "fecha": "20:00"},
    "6": {"abre": "09:00", "fecha": "17:00"}
  }'::jsonb;

with categorias as (
  insert into salao_categorias_servico (nome, ordem) values
    ('Cabelo', 1),
    ('Unhas', 2),
    ('Estética', 3)
  returning id, nome
),
prof as (
  insert into salao_profissionais (nome, bio, foto_url) values
    ('Ana Souza', 'Especialista em coloração e cortes femininos.', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&q=80&auto=format&fit=crop'),
    ('Bruna Lima', 'Manicure e nail art.', 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=400&q=80&auto=format&fit=crop'),
    ('Carla Mendes', 'Esteticista, especialista em limpeza de pele e bem-estar.', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80&auto=format&fit=crop')
  returning id, nome
),
serv as (
  insert into salao_servicos (categoria_id, nome, duracao_minutos, preco, ordem, imagem_url)
  select c.id, s.nome, s.duracao, s.preco, s.ordem, s.imagem
  from categorias c
  join (values
    ('Cabelo', 'Corte feminino', 60, 90.00, 1, 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=600&q=80&auto=format&fit=crop'),
    ('Cabelo', 'Coloração', 120, 220.00, 2, 'https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=600&q=80&auto=format&fit=crop'),
    ('Unhas', 'Manicure', 45, 45.00, 1, 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&q=80&auto=format&fit=crop'),
    ('Unhas', 'Pedicure', 45, 50.00, 2, 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=600&q=80&auto=format&fit=crop'),
    ('Estética', 'Limpeza de pele', 60, 150.00, 1, 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&q=80&auto=format&fit=crop')
  ) as s(categoria, nome, duracao, preco, ordem, imagem) on s.categoria = c.nome
  returning id, nome, categoria_id
)
insert into salao_profissionais_servicos (profissional_id, servico_id)
select p.id, s.id
from prof p
cross join serv s
where (p.nome = 'Ana Souza' and s.nome in ('Corte feminino', 'Coloração'))
   or (p.nome = 'Bruna Lima' and s.nome in ('Manicure', 'Pedicure'))
   or (p.nome = 'Carla Mendes' and s.nome in ('Limpeza de pele'));

insert into salao_horarios_trabalho (profissional_id, dia_semana, hora_inicio, hora_fim)
select p.id, dia, '09:00', '18:00'
from salao_profissionais p
cross join generate_series(1, 5) as dia;
