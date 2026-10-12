package dd

import io.agroal.api.AgroalDataSource
import io.quarkus.runtime.StartupEvent
import jakarta.enterprise.context.ApplicationScoped
import jakarta.enterprise.event.Observes
import java.nio.file.Files
import java.nio.file.Path

// The migrations create an empty schema. The tests are written against the
// sample data (the admin and userN accounts, Sample Ward and its districts),
// so load backend/db/sample_data.sql - the same file a developer runs by hand
// - into the throwaway test database once it has been migrated.
@ApplicationScoped
class SampleDataLoader(
    val dataSource: AgroalDataSource,
) {
    fun load(@Observes event: StartupEvent) {
        val script = Files.readString(SAMPLE_DATA)
        dataSource.connection.use { connection ->
            connection.createStatement().use { it.execute(script) }
        }
    }

    private companion object {
        // Tests run with the backend directory as the working directory.
        val SAMPLE_DATA: Path = Path.of("db", "sample_data.sql")
    }
}
