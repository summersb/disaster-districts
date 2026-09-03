-- `name` was globally unique across every ward, so two different people in
-- different wards (or even two different families in the same import batch)
-- sharing a given name would collide. Uniqueness should be per-ward and
-- per-person (family name + given name), matching MembersResource's
-- application-level conflict check.
alter table members drop constraint members_name_key;
alter table members add constraint members_ward_family_name_key unique (ward_id, family_name, name);
