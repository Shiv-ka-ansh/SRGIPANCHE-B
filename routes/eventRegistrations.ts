import { Router } from "express";
import EventRegistration from "../models/EventRegistration";
import Student from "../models/Student";
import { sendEventConfirmation } from "../services/email";
import {
  verifyToken,
  requireAdmin,
  requireSuperAdmin,
  AuthRequest,
} from "../middleware/auth";

const router = Router();

// POST /api/event-registrations (Admin only)
router.post(
  "/",
  verifyToken,
  requireAdmin,
  async (req: AuthRequest, res, next) => {
    try {
      const { studentId, events, isGroup, groupMembers, participantIds } =
        req.body;

      if (!studentId || !events || !events.length) {
        return res
          .status(400)
          .json({
            success: false,
            error: "Student ID and events are required",
          });
      }

      const student = await Student.findById(studentId);
      if (!student) {
        return res
          .status(404)
          .json({ success: false, error: "Student not found" });
      }

      // DUPLICATE CHECK: Find all existing registrations for this student
      const existingRegs = await EventRegistration.find({
        studentId: student._id,
      });
      const existingEventsSet = new Set(
        existingRegs.flatMap((r) =>
          r.events.map((e) => `${e.eventName}|${e.subEvent || ""}`),
        ),
      );

      const duplicates = events.filter((e: any) =>
        existingEventsSet.has(`${e.eventName}|${e.subEvent || ""}`),
      );

      if (duplicates.length > 0) {
        const names = duplicates.map((d: any) => d.eventName).join(", ");
        return res.status(400).json({
          success: false,
          error: `Student is already registered for: ${names}`,
        });
      }

      // Calculate total amount from provided events
      const memberCount =
        isGroup && groupMembers && groupMembers.length > 0
          ? groupMembers.length
          : 1;
      const totalAmount = events.reduce((sum: number, ev: any) => {
        const amt = Number(ev.amount) || 0;
        if (ev.isFlat) {
          return sum + amt;
        }
        return sum + amt * memberCount;
      }, 0);

      const registration = new EventRegistration({
        studentId: student._id,
        studentName: student.fullName,
        rollNo: student.rollNo,
        events,
        totalAmount,
        isGroup: isGroup || false,
        groupMembers: groupMembers || [],
        participantIds: participantIds || [],
        processedBy: req.user.id,
      });

      await registration.save();

      // Update main student status to processed
      await Student.findByIdAndUpdate(studentId, { status: "processed" });

      // Update participants status to processed if it's a group registration
      if (isGroup && participantIds && participantIds.length > 0) {
        await Student.updateMany(
          { _id: { $in: participantIds } },
          { status: "processed" },
        );
      }

      // Send email confirmation
      sendEventConfirmation(
        student.email,
        student.fullName,
        events,
        totalAmount,
        student.token,
      )
        .then(() => {
          registration.emailSent = true;
          registration.save();
        })
        .catch((err) =>
          console.error("Failed to send event confirmation email", err),
        );

      res.status(201).json({ success: true, registration });
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/event-registrations (Admin/Superadmin)
router.get("/", verifyToken, requireAdmin, async (req, res, next) => {
  try {
    const registrations = await EventRegistration.find()
      .populate("processedBy", "name email")
      .sort({ processedAt: -1 })
      .lean();

    // Manually fetch and map Student data to avoid mongoose populate quirks
    const studentIds = [
      ...new Set(registrations.map((r) => r.studentId.toString())),
    ];
    const students = await Student.find({ _id: { $in: studentIds } })
      .select("token mobileNo branch")
      .lean();

    // Create a dictionary for quick lookup
    const studentMap = students.reduce((acc, student) => {
      acc[student._id.toString()] = student;
      return acc;
    }, {} as any);

    console.log(
      `--- GET /event-registrations: Found ${registrations.length} registrations, ${students.length} students`,
    );

    // Map the fields to the registrations
    const mappedRegistrations = registrations.map((reg) => {
      const r = { ...reg } as any; // Create a new object to avoid mutation issues with lean()
      const sid = r.studentId?.toString();
      if (sid && studentMap[sid]) {
        const student = studentMap[sid];
        r.token = student.token;
        r.mobileNo = student.mobileNo;
        r.branch = student.branch;
      } else {
        console.log(`--- WARN: No student found for studentId=${sid}`);
      }
      return r;
    });

    if (mappedRegistrations.length > 0) {
      const sample = mappedRegistrations[0];
      console.log(
        `--- Sample mapped registration: token=${sample.token}, mobileNo=${sample.mobileNo}, branch=${sample.branch}`,
      );
    }

    res.json({ success: true, registrations: mappedRegistrations });
  } catch (error) {
    next(error);
  }
});

// GET /api/event-registrations/student/:studentId
router.get(
  "/student/:studentId",
  verifyToken,
  requireAdmin,
  async (req, res, next) => {
    try {
      const registrations = await EventRegistration.find({
        studentId: req.params.studentId,
      }).populate("processedBy", "name");
      res.json({ success: true, registrations });
    } catch (error) {
      next(error);
    }
  },
);

// PUT /api/event-registrations/:id (SuperAdmin only)
router.put("/:id", verifyToken, requireSuperAdmin, async (req, res, next) => {
  try {
    const {
      events,
      isGroup,
      groupMembers,
      studentName,
      rollNo,
      totalAmount: providedTotal,
      remark,
    } = req.body;

    // Use provided total or calculate from events if events are provided
    let totalAmount = providedTotal;
    if (events && !providedTotal) {
      const existingRegistration = await EventRegistration.findById(
        req.params.id,
      );
      if (!existingRegistration) {
        return res
          .status(404)
          .json({ success: false, error: "Registration not found" });
      }
      const isGrp =
        isGroup !== undefined ? isGroup : existingRegistration.isGroup;
      const grpMembers =
        groupMembers !== undefined
          ? groupMembers
          : existingRegistration.groupMembers;
      const memCount =
        isGrp && grpMembers && grpMembers.length > 0 ? grpMembers.length : 1;

      totalAmount = events.reduce((sum: number, ev: any) => {
        const amt = Number(ev.amount) || 0;
        if (ev.isFlat) {
          return sum + amt;
        }
        return sum + amt * memCount;
      }, 0);
    }

    const updateData: any = {};
    if (events) updateData.events = events;
    if (isGroup !== undefined) updateData.isGroup = isGroup;
    if (groupMembers) updateData.groupMembers = groupMembers;
    if (studentName) updateData.studentName = studentName;
    if (rollNo) updateData.rollNo = rollNo;
    if (totalAmount !== undefined) updateData.totalAmount = totalAmount;
    if (remark !== undefined) updateData.remark = remark;

    const registration = await EventRegistration.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true },
    );

    if (!registration) {
      return res
        .status(404)
        .json({ success: false, error: "Registration not found" });
    }

    res.json({ success: true, registration });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/event-registrations/:id (Admin required)
router.delete("/:id", verifyToken, requireAdmin, async (req, res, next) => {
  try {
    console.log(`--- REQ: Delete Registration ID: ${req.params.id}`);
    const registration = await EventRegistration.findById(req.params.id);
    if (!registration) {
      return res
        .status(404)
        .json({ success: false, error: "Registration not found" });
    }

    // Collect all affected student IDs (main + participants)
    const affectedIds = [
      registration.studentId,
      ...(registration.participantIds || []),
    ].filter(Boolean);

    await EventRegistration.findByIdAndDelete(req.params.id);

    // For each affected student, check if they have ANY remaining registrations
    for (const sid of affectedIds) {
      const remainingAsMain = await EventRegistration.exists({ studentId: sid });
      const remainingAsParticipant = await EventRegistration.exists({ participantIds: sid });
      if (!remainingAsMain && !remainingAsParticipant) {
        await Student.findByIdAndUpdate(sid, { status: "registered" });
      }
    }

    res.json({ success: true, message: "Registration deleted successfully" });
  } catch (error) {
    next(error);
  }
});

// POST /api/event-registrations/:id/resend (SuperAdmin required)
router.post(
  "/:id/resend",
  verifyToken,
  requireSuperAdmin,
  async (req, res, next) => {
    try {
      const registration = await EventRegistration.findById(req.params.id);
      if (!registration) {
        return res
          .status(404)
          .json({ success: false, error: "Registration not found" });
      }

      const student = await Student.findById(registration.studentId);
      if (!student) {
        return res
          .status(404)
          .json({ success: false, error: "Student not found" });
      }

      const success = await sendEventConfirmation(
        student.email,
        student.fullName,
        registration.events,
        registration.totalAmount,
        student.token,
      );

      if (success) {
        registration.emailSent = true;
        await registration.save();
        return res.json({
          success: true,
          message: "Email resent successfully",
        });
      } else {
        return res
          .status(500)
          .json({ success: false, error: "Failed to send email" });
      }
    } catch (error) {
      next(error);
    }
  },
);

export default router;
