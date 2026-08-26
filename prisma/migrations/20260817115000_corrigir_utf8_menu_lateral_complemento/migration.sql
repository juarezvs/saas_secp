UPDATE "menus_itens_perfil"
SET "label" = CASE "label"
  WHEN 'Equipamentos biom?tricos' THEN 'Equipamentos biométricos'
  ELSE "label"
END
WHERE "label" IN ('Equipamentos biom?tricos');
