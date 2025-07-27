import PropTypes from 'prop-types';


export const GunningScreenProps = {
  files: PropTypes.arrayOf(PropTypes.object),
  fileDataCache: PropTypes.instanceOf(Map),
  selectedFile: PropTypes.object,
  selectedFurnace: PropTypes.shape({
    furnace_id: PropTypes.string,
  }),
  isUiDisabled: PropTypes.bool,
  onDataUpdate: PropTypes.func,
  onCaptureScreenshot: PropTypes.func,
  currentGunningData: PropTypes.object,
};

export const Point = {
  x: PropTypes.number,
  y: PropTypes.number,
  z: PropTypes.number,
  position: PropTypes.arrayOf(PropTypes.number),
  thickness: PropTypes.number,
  furnaceId: PropTypes.string,
  detectedSection: PropTypes.string,
};

export const RepairProposalData = {
  areas: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      volume: PropTypes.number,
      weight: PropTypes.number,
      cost: PropTypes.number,
      pointCount: PropTypes.number,
      avgWear: PropTypes.number,
      areaSize: PropTypes.number,
      material: PropTypes.string,
    })
  ),
  total: PropTypes.shape({
    volume: PropTypes.number,
    weight: PropTypes.number,
    cost: PropTypes.number,
    material: PropTypes.string,
  }),
  parameters: PropTypes.shape({
    wearThreshold: PropTypes.number,
    distanceBetweenAreas: PropTypes.number,
    minimumAreaSize: PropTypes.number,
    repairMaterial: PropTypes.string,
    timestamp: PropTypes.number,
  }),
};