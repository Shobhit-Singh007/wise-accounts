package com.gstbilling.app.di

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.preferencesDataStore
import androidx.room.Room
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import com.gstbilling.app.BuildConfig
import com.gstbilling.app.data.local.AppDatabase
import com.gstbilling.app.data.local.dao.CustomerDao
import com.gstbilling.app.data.local.dao.InvoiceDao
import com.gstbilling.app.data.local.dao.ProductDao
import com.gstbilling.app.data.remote.api.ApiService
import com.gstbilling.app.data.remote.api.AuthInterceptor
import com.gstbilling.app.data.remote.api.ImportApi
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "gst_billing_prefs")

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun provideDataStore(@ApplicationContext context: Context): DataStore<Preferences> {
        return context.dataStore
    }

    @Provides
    @Singleton
    fun provideOkHttpClient(authInterceptor: AuthInterceptor): OkHttpClient {
        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }
        return OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .addInterceptor(logging)
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()
    }

    @Provides
    @Singleton
    fun provideRetrofit(okHttpClient: OkHttpClient): Retrofit {
        return Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    @Provides
    @Singleton
    fun provideApiService(retrofit: Retrofit): ApiService {
        return retrofit.create(ApiService::class.java)
    }

    @Provides
    @Singleton
    fun provideImportApi(retrofit: Retrofit): ImportApi {
        return retrofit.create(ImportApi::class.java)
    }

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): AppDatabase {
        return Room.databaseBuilder(
            context,
            AppDatabase::class.java,
            "wise_accounts_db"
        )
            .addMigrations(MIGRATION_1_2, MIGRATION_2_3, MIGRATION_3_4, MIGRATION_4_5, MIGRATION_5_6, MIGRATION_6_7)
            .build()
    }

    @Provides
    fun provideCustomerDao(database: AppDatabase): CustomerDao {
        return database.customerDao()
    }

    @Provides
    fun provideProductDao(database: AppDatabase): ProductDao {
        return database.productDao()
    }

    @Provides
    fun provideInvoiceDao(database: AppDatabase): InvoiceDao {
        return database.invoiceDao()
    }

    private val MIGRATION_1_2 = Migration(1, 2) { db ->
        db.execSQL("ALTER TABLE invoices ADD COLUMN itemsJson TEXT NOT NULL DEFAULT '[]'")
        db.execSQL("ALTER TABLE customers ADD COLUMN syncOperation TEXT DEFAULT NULL")
    }

    private val MIGRATION_2_3 = Migration(2, 3) { db ->
        db.execSQL("ALTER TABLE invoices ADD COLUMN customerAddress TEXT DEFAULT NULL")
        db.execSQL("ALTER TABLE invoices ADD COLUMN customerPhone TEXT DEFAULT NULL")
        db.execSQL("ALTER TABLE invoices ADD COLUMN customerState TEXT DEFAULT NULL")
        db.execSQL("ALTER TABLE invoices ADD COLUMN placeOfSupply TEXT DEFAULT NULL")
        db.execSQL("ALTER TABLE invoices ADD COLUMN reverseCharge INTEGER NOT NULL DEFAULT 0")
        db.execSQL("ALTER TABLE invoices ADD COLUMN poNo TEXT DEFAULT NULL")
        db.execSQL("ALTER TABLE invoices ADD COLUMN poDate TEXT DEFAULT NULL")
        db.execSQL("ALTER TABLE invoices ADD COLUMN challanNo TEXT DEFAULT NULL")
        db.execSQL("ALTER TABLE invoices ADD COLUMN challanDate TEXT DEFAULT NULL")
        db.execSQL("ALTER TABLE invoices ADD COLUMN lrNo TEXT DEFAULT NULL")
        db.execSQL("ALTER TABLE invoices ADD COLUMN paymentType TEXT DEFAULT NULL")
        db.execSQL("ALTER TABLE invoices ADD COLUMN paymentNote TEXT DEFAULT NULL")
        db.execSQL("ALTER TABLE invoices ADD COLUMN cessTotal REAL NOT NULL DEFAULT 0")
        db.execSQL("ALTER TABLE invoices ADD COLUMN totalInWords TEXT DEFAULT NULL")
    }

    private val MIGRATION_3_4 = Migration(3, 4) { db ->
        db.execSQL("ALTER TABLE invoices ADD COLUMN totalQuantity INTEGER NOT NULL DEFAULT 0")
    }

    private val MIGRATION_4_5 = Migration(4, 5) { }

    private val MIGRATION_5_6 = Migration(5, 6) { }

    private val MIGRATION_6_7 = Migration(6, 7) { }
}
