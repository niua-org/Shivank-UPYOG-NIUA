import React, { useEffect, useState } from "react";
import {
  FormStep,
  TextInput,
  CardLabel,
  Dropdown,
  InfoBannerIcon,
  LocationIcon,
  Card,
  CardHeader,
  CardCaption,
} from "@upyog/digit-ui-react-components";
import { useLocation } from "react-router-dom";
import Timeline from "../components/ASTTimeline";
import { Controller, useForm } from "react-hook-form";

const NewAsset = ({ t, config, onSelect, formData }) => {
  const [assetDetails, setAssetDetails] = useState(
    formData.assetDetails && formData.assetDetails.assetParentCategory === formData?.asset?.assettype?.code
      ? formData.assetDetails
      : { assetParentCategory: formData?.asset?.assettype?.code }
  );

  const [categoriesWiseData, setCategoriesWiseData] = useState();

  //  * get @param city & state id
  const tenantId = Digit.ULBService.getCurrentTenantId();
  const stateTenantId = Digit.ULBService.getStateId();

  //  This call with tenantId (Get city-level data)
  const cityResponseObject = Digit.Hooks.useCustomMDMSV2(tenantId, "ASSET", [{ name: "AssetParentCategoryFields" }], {
    select: (data) => {
      const formattedData = data?.["ASSET"]?.["AssetParentCategoryFields"];
      return formattedData;
    },
  });

  // This call with stateTenantId (Get state-level data)
  const stateResponseObject = Digit.Hooks.useCustomMDMSV2(stateTenantId, "ASSET", [{ name: "AssetParentCategoryFields" }], {
    select: (data) => {
      const formattedData = data?.["ASSET"]?.["AssetParentCategoryFields"];
      return formattedData;
    },
  });

  useEffect(() => {
    let combinedData;
    // if city level master is not available then fetch  from state-level
    if (cityResponseObject?.data) {
      combinedData = cityResponseObject.data;
    } else if (stateResponseObject?.data) {
      combinedData = stateResponseObject.data;
    } else {
      combinedData = []; // Or an appropriate default value for empty data
      console.log("Both cityResponseObject and stateResponseObject data are unavailable.");
    }
    setCategoriesWiseData(combinedData);
  }, [cityResponseObject, stateResponseObject]);

  let formJson = [];
  if (Array.isArray(categoriesWiseData)) {
    // console.log("Categories Data:", categoriesWiseData);

    // // Log the selected asset type for debugging
    // console.log("Selected Asset Type:", formData?.asset?.assettype?.code);

    // Filter categories based on the selected assetParentCategory
    formJson = categoriesWiseData
      .filter((category) => {
        const isMatch = category.assetParentCategory === formData?.asset?.assettype?.code || category.assetParentCategory === "COMMON";
        // console.log(`Matching ${category.assetParentCategory} with ${formData?.asset?.assettype?.code}:`, isMatch);
        return isMatch;
      })
      .map((category) => category.fields) // Extract the fields array
      .flat() // Flatten the fields array
      .filter((field) => field.active === true); // Filter by active status
  }

  const { pathname: url } = useLocation();
  let index = window.location.href.charAt(window.location.href.length - 1);
  let validation = {};
  const { control } = useForm();

  //  regexPattern function is use for validation
  const regexPattern = (columnType) => {
    if (!columnType) {
      return "^[-+]?([1-8]?\\d(\\.\\d+)?|90(\\.0+)?),\\s*[-+]?(180(\\.0+)?|((1[0-7]\\d)|([1-9]?\\d))(\\.\\d+)?)$";
    } else if (columnType === "number") {
      return "^d+(.d+)?$";
    } else if (columnType === "text") {
      return "^[-+]?([1-8]?\\d(\\.\\d+)?|90(\\.0+)?),\\s*[-+]?(180(\\.0+)?|((1[0-7]\\d)|([1-9]?\\d))(\\.\\d+)?)$";
    } else {
      return "^[-+]?([1-8]?\\d(\\.\\d+)?|90(\\.0+)?),\\s*[-+]?(180(\\.0+)?|((1[0-7]\\d)|([1-9]?\\d))(\\.\\d+)?)$";
    }
  };

  const goNext = () => {
    let owner = formData.assetDetails && formData.assetDetails[index];
    assetDetails.owner = owner;
    onSelect(config.key, assetDetails, false, index);
  };

  const onSkip = () => onSelect();

  const calculateAssetAge = (purchaseDate) => {
    const today = new Date();
    const purchaseDatetime = new Date(purchaseDate);
    const diffInYears = today.getFullYear() - purchaseDatetime.getFullYear();
    const diffInMonths = today.getMonth() - purchaseDatetime.getMonth();

    let age;
    if (diffInYears > 0) {
      age = diffInYears + " " + t("YEAR");
    } else if (diffInMonths >= 0) {
      age = diffInMonths + " " + t("MONTH");
    } else {
      const diffInDays = today.getDate() - purchaseDatetime.getDate();
      age = diffInDays + " " + t("DAY");
    }
    setAssetDetails((prevDetails) => ({
      ...prevDetails,
      assetAge: age,
    }));
  };

  // Set State Dynamically!
  const handleInputChange = (e) => {
    // Get the name & value from the input and select field
    const { name, value } = e.target ? e.target : { name: e.name, value: e };

    setAssetDetails((prevData) => {
      // Update the current field
      const updatedData = {
        ...prevData,
        [name]: value,
      };

      // Check if both acquisitionCost and purchaseCost are set and calculate bookValue
      const acquisitionCost = parseFloat(updatedData.acquisitionCost) || 0;
      const purchaseCost = parseFloat(updatedData.purchaseCost) || 0;

      if (acquisitionCost && purchaseCost) {
        updatedData.bookValue = acquisitionCost + purchaseCost;
      }

      // Calculate asset age if the field is "purchaseDate"
      if (name === "purchaseDate") {
        calculateAssetAge(value);
      }

      return updatedData;
    });
  };

  //  Get location
  const fetchCurrentLocation = (name) => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setAssetDetails((prevDetails) => ({
            ...prevDetails,
            [name]: `${latitude}, ${longitude}`, // Update the specific field
          }));
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("Unable to retrieve your location. Please check your browser settings.");
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  const assetType = [
    {
      code: "Fixed Asset",
      i18nKey: "Fixed Asset",
    },
    {
      code: "Infrastructure Asset",
      i18nKey: "Infrastructure Asset",
    },
  ];
  const assetCurrentUsage = [
    {
      code: "In-use",
      i18nKey: "In-use",
    },
    {
      code: "In-store",
      i18nKey: "In-store",
    },
    {
      code: "Disposed",
      i18nKey: "Disposed",
    },
  ];
  return (
    <React.Fragment>
      {window.location.href.includes("/employee") ? <Timeline currentStep={2} /> : null}
      <Card>
        <CardCaption>
          {t(formData.asset.Department["value"])}/{formData.asset.assetclassification["value"]}/{formData.asset.assettype["value"]}/
          {formData.asset.assetsubtype["value"]}/{formData.asset.BookPagereference}
        </CardCaption>
      </Card>
      <FormStep config={config} onSelect={goNext} onSkip={onSkip} t={t}>
        <React.Fragment>
          {formJson.map((row, index) => (
            <div key={index}>
              {/* Render the label with the localization key and a mandatory asterisk */}
              <CardLabel key={index}>{`${t(row.code)} *`}</CardLabel>

              {row.type === "date" ? (
                // If the type is 'date', render a standard HTML input element of type 'date'
                <TextInput
                  t={t}
                  type={"date"}
                  isMandatory={false}
                  optionKey="i18nKey"
                  name={row.name}
                  value={assetDetails[row.name]}
                  onChange={handleInputChange}
                  style={{ width: "50%" }}
                  max={new Date().toISOString().split("T")[0]}
                  rules={{
                    required: t("CORE_COMMON_REQUIRED_ERRMSG"),
                    validDate: (val) => (/^\d{4}-\d{2}-\d{2}$/.test(val) ? true : t("ERR_DEFAULT_INPUT_FIELD_MSG")),
                  }}
                />
              ) : row.type == "dropdown" ? (
                //  if dropdown render
                <Controller
                  control={control}
                  name={row.name}
                  isMandatory={false}
                  defaultValue={assetDetails[row.name] ? assetDetails[row.name] : ""}
                  rules={{ required: t("CORE_COMMON_REQUIRED_ERRMSG") }}
                  render={(props) => (
                    <Dropdown
                      className="form-field"
                      selected={assetDetails[row.name]}
                      select={handleInputChange}
                      option={row.options}
                      optionKey="i18nKey"
                      placeholder={"Select"}
                      isMandatory={false}
                      t={t}
                    />
                  )}
                />
              ) : row.addCurrentLocationButton === true ? (
                // if Fetch Location True
                <div style={{ position: "relative", width: "50%" }}>
                  <TextInput
                    t={t}
                    type={row.type}
                    isMandatory={row.isMandatory}
                    optionKey="i18nKey"
                    name={row.name}
                    value={assetDetails[row.name] || ""}
                    onChange={handleInputChange}
                    style={{ flex: 1 }}
                    ValidationRequired={false}
                    {...(validation = {
                      isRequired: true,
                      pattern: regexPattern(row.columnType),
                      type: row.columnType,
                      title: t("VALID_LAT_LONG"),
                    })}
                  />
                  <div
                    className="butt-icon"
                    onClick={() => {
                      fetchCurrentLocation(row.name);
                    }}
                    style={{
                      position: "absolute",
                      right: "0", // Position the icon 10px from the right edge of the input
                      top: "50%",
                      transform: "translateY(-50%)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      padding: "2px 5px",
                    }}
                  >
                    {/* {t("AST_FETCH_LOCATION")} */}
                    <LocationIcon styles={{ width: "16px", border: "none" }} className="fill-path-primary-main" />
                  </div>
                </div>
              ) : (
                // If the type is not 'date', use the dynamically TextInput component
                <TextInput
                  t={t}
                  type={row.type}
                  isMandatory={row.isMandatory}
                  optionKey="i18nKey"
                  name={row.name}
                  value={assetDetails[row.name] || ""}
                  onChange={handleInputChange}
                  {...(validation = {
                    isRequired: row.isMandatory,
                    pattern: regexPattern(row.columnType),
                    type: row.columnType,
                    title: t("PT_NAME_ERROR_MESSAGE"),
                  })}
                  style={{ width: "50%" }}
                  readOnly={row.isReadOnly}
                />
              )}
            </div>
          ))}
        </React.Fragment>
      </FormStep>
    </React.Fragment>
  );
};
export default NewAsset;
