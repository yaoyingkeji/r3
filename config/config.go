package config

import (
	"encoding/json"
	"math/rand"
	"os"
	"r3/db"
	"r3/log"
	"r3/tools"
	"r3/types"
	"regexp"
	"sync"

	"github.com/gbrlsnchs/jwt/v3"
	"github.com/gofrs/uuid"
)

var (
	access_mx = &sync.RWMutex{}

	// application names
	appName      string
	appNameShort string

	// application version details (version syntax: major.minor.patch.build)
	// only major/minor version updates may effect the database
	appVersion      string // full version of this application (1.2.0.1023)
	appVersionCut   string // major+minor version of this application (1.2)
	appVersionBuild string // build counter of this application (1023)

	// configuration file location
	filePath      string // location of configuration file in JSON format
	filePathTempl string = "config_template.json"

	// configuration values from file, must not be changed during runtime
	File types.FileType

	// operation data
	license     = types.License{}
	tokenSecret *jwt.HMACSHA
)

// returns
// *full application version (1.2.0.1023)
// *major+minor application version (1.2)
// *build number (1023)
// *database version (1.2), which is kept equal to major+minor app version
func GetAppVersions() (string, string, string, string) {
	access_mx.RLock()
	defer access_mx.RUnlock()
	return appVersion, appVersionCut, appVersionBuild, GetString("dbVersionCut")
}
func GetAppName() (string, string) {
	access_mx.RLock()
	defer access_mx.RUnlock()
	return appName, appNameShort
}
func GetConfigFilepath() string {
	access_mx.RLock()
	defer access_mx.RUnlock()
	return filePath
}
func GetLicense() types.License {
	access_mx.RLock()
	defer access_mx.RUnlock()
	return license
}
func GetLicenseActive() bool {
	access_mx.RLock()
	defer access_mx.RUnlock()
	return license.ValidUntil > tools.GetTimeUnix()
}
func GetLicenseLoginCount() int64 {
	access_mx.RLock()
	defer access_mx.RUnlock()
	return license.LoginCount
}
func GetLicenseUsed() bool {
	access_mx.RLock()
	defer access_mx.RUnlock()
	return license.ValidUntil != 0
}
func GetLicenseValidUntil() int64 {
	access_mx.RLock()
	defer access_mx.RUnlock()
	return license.ValidUntil
}
func GetTokenSecret() *jwt.HMACSHA {
	access_mx.RLock()
	defer access_mx.RUnlock()
	return tokenSecret
}

// setters
func SetAppVersion(version string) {
	access_mx.Lock()
	defer access_mx.Unlock()
	appVersion = version
	appVersionCut = regexp.MustCompile(`\.\d+\.\d+$`).ReplaceAllString(version, "")
	appVersionBuild = regexp.MustCompile(`^\d+\.\d+\.\d+\.`).ReplaceAllString(version, "")
}
func SetAppName(name string, nameShort string) {
	access_mx.Lock()
	defer access_mx.Unlock()
	appName = name
	appNameShort = nameShort
}
func SetConfigFilePath(path string) {
	access_mx.Lock()
	defer access_mx.Unlock()
	filePath = path
}
func SetLicense(l types.License) {
	access_mx.Lock()
	defer access_mx.Unlock()
	license = l
}
func SetLogLevels() {
	log.SetLogLevel("api", int(GetUint64("logApi")))
	log.SetLogLevel("backup", int(GetUint64("logBackup")))
	log.SetLogLevel("cache", int(GetUint64("logCache")))
	log.SetLogLevel("cluster", int(GetUint64("logCluster")))
	log.SetLogLevel("csv", int(GetUint64("logCsv")))
	log.SetLogLevel("imager", int(GetUint64("logImager")))
	log.SetLogLevel("ldap", int(GetUint64("logLdap")))
	log.SetLogLevel("mail", int(GetUint64("logMail")))
	log.SetLogLevel("module", int(GetUint64("logModule")))
	log.SetLogLevel("scheduler", int(GetUint64("logScheduler")))
	log.SetLogLevel("server", int(GetUint64("logServer")))
	log.SetLogLevel("transfer", int(GetUint64("logTransfer")))
	log.SetLogLevel("websocket", int(GetUint64("logWebsocket")))
}
func SetInstanceIdIfEmpty() error {
	if GetString("instanceId") != "" {
		return nil
	}

	id, err := uuid.NewV4()
	if err != nil {
		return err
	}

	tx, err := db.Pool.Begin(db.Ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(db.Ctx)

	if err := SetString_tx(tx, "instanceId", id.String()); err != nil {
		return err
	}
	return tx.Commit(db.Ctx)
}

// config file
func LoadFile() error {
	access_mx.Lock()
	defer access_mx.Unlock()

	// check for config file existence
	exists, err := tools.Exists(filePath)
	if err != nil {
		return err
	}
	if !exists {
		// file does not exist, attempt to copy from template
		if err := tools.FileCopy(filePathTempl, filePath, false); err != nil {
			return err
		}
	}

	// read configuration from JSON file
	configJson, err := os.ReadFile(filePath)
	if err != nil {
		return err
	}
	configJson = tools.RemoveUtf8Bom(configJson)

	// unmarshal configuration JSON file
	return json.Unmarshal(configJson, &File)
}
func WriteFile() error {
	access_mx.Lock()
	defer access_mx.Unlock()

	// marshal configuration JSON
	json, err := json.MarshalIndent(File, "", "\t")
	if err != nil {
		return err
	}

	// write configuration to JSON file
	return os.WriteFile(filePath, json, 0644)
}

// token
func ProcessTokenSecret() error {
	secret := GetString("tokenSecret")
	if secret == "" {
		tx, err := db.Pool.Begin(db.Ctx)
		if err != nil {
			return err
		}

		min, max := 32, 48
		secret = tools.RandStringRunes(rand.Intn(max-min+1) + min)

		if err := SetString_tx(tx, "tokenSecret", secret); err != nil {
			tx.Rollback(db.Ctx)
			return err
		}
		tx.Commit(db.Ctx)
	}

	access_mx.Lock()
	defer access_mx.Unlock()

	tokenSecret = jwt.NewHS256([]byte(secret))
	return nil
}
