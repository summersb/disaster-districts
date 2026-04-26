CREATE SEQUENCE ward_join_requests_id_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE ward_join_requests (
  id          BIGINT PRIMARY KEY DEFAULT nextval('ward_join_requests_id_seq'),
  user_id     BIGINT NOT NULL,
  ward_id     BIGINT NOT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  message     TEXT,
  requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
  resolved_by BIGINT,
  resolved_at TIMESTAMP,
  assigned_role VARCHAR(50)
);

ALTER TABLE ward_join_requests ADD CONSTRAINT fk_wjr_user FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE ward_join_requests ADD CONSTRAINT fk_wjr_ward FOREIGN KEY (ward_id) REFERENCES wards(id);
ALTER TABLE ward_join_requests ADD CONSTRAINT fk_wjr_resolver FOREIGN KEY (resolved_by) REFERENCES users(id);
