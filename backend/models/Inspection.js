import mongoose from "mongoose";

const inspectionReportSchema = new mongoose.Schema(
  {
    engine: { type: Number, min:1, max:5, default:null }, transmission: { type: Number, min:1, max:5, default:null },
    brakes: { type: Number, min:1, max:5, default:null }, tyres: { type: Number, min:1, max:5, default:null },
    ac: { type: Number, min:1, max:5, default:null }, electricals: { type: Number, min:1, max:5, default:null },
    suspension: { type: Number, min:1, max:5, default:null }, exterior: { type: Number, min:1, max:5, default:null },
    interior: { type: Number, min:1, max:5, default:null }, odometerReading: { type: Number, default:null },
    overallRating: { type: Number, min:1, max:5, default:null }, summary: { type: String, trim:true, default:"" },
    recommendations: { type: String, trim:true, default:"" },
  },
  { _id: false }
);

const inspectionPhotoSchema = new mongoose.Schema(
  { url: { type: String, required:true }, publicId: { type: String, required:true }, caption: { type: String, trim:true, default:"" } },
  { _id: false }
);

const inspectionSchema = new mongoose.Schema(
  {
    carId:    { type: mongoose.Schema.Types.ObjectId, ref:"Car", required:true },
    carTitle: { type: String, trim:true, default:"" }, carBrand: { type: String, trim:true, default:"" },
    carModel: { type: String, trim:true, default:"" }, carYear: { type: Number, default:null }, carImage: { type: String, default:"" },
    buyerId: { type: String, required:true }, buyerName: { type: String, trim:true, default:"" }, buyerEmail: { type: String, trim:true, default:"" },
    sellerId: { type: String, default:"" }, sellerName: { type: String, trim:true, default:"" },
    inspectorId: { type: String, default:"" }, inspectorName: { type: String, trim:true, default:"" }, inspectorEmail: { type: String, trim:true, default:"" },
    status: { type: String, enum:["requested","accepted","completed","rejected","cancelled"], default:"requested" },
    preferredDate: { type: Date, default:null }, preferredTime: { type: String, trim:true, default:"" },
    location: { type: String, trim:true, default:"" }, notes: { type: String, trim:true, default:"" },
    report: { type: inspectionReportSchema, default:null }, inspectionPhotos: { type:[inspectionPhotoSchema], default:[] },
    inspectedAt: { type: Date, default:null }, adminNotes: { type: String, trim:true, default:"" },
  },
  { timestamps: true }
);

/* Indexes */
inspectionSchema.index({ buyerId: 1, createdAt: -1 });
inspectionSchema.index({ inspectorId: 1, status: 1 });
inspectionSchema.index({ carId: 1 });
inspectionSchema.index({ status: 1, createdAt: -1 });

const Inspection = mongoose.model("Inspection", inspectionSchema);
export default Inspection;