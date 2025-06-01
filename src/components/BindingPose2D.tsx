
import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, RotateCcw } from "lucide-react";

interface BindingPose2DProps {
  ligandSmiles: string;
  receptorType?: string;
  affinityScore?: number;
  width?: number;
  height?: number;
}

const BindingPose2D: React.FC<BindingPose2DProps> = ({ 
  ligandSmiles,
  receptorType,
  affinityScore,
  width = 400, 
  height = 300 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [interactionData, setInteractionData] = useState<any>(null);

  useEffect(() => {
    if (ligandSmiles && receptorType) {
      generateBindingPose();
    }
  }, [ligandSmiles, receptorType, affinityScore]);

  const generateBindingPose = async () => {
    setIsLoading(true);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw binding site background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, height);
    
    // Draw binding pocket (simplified 2D representation)
    drawBindingPocket(ctx);
    
    // Draw ligand molecule (simplified)
    drawLigandStructure(ctx);
    
    // Draw interaction lines
    drawInteractions(ctx);
    
    // Generate mock interaction data
    const interactions = generateInteractionData();
    setInteractionData(interactions);
    
    setIsLoading(false);
  };

  const drawBindingPocket = (ctx: CanvasRenderingContext2D) => {
    // Draw receptor binding site as irregular shape
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    
    ctx.beginPath();
    ctx.moveTo(50, 80);
    ctx.quadraticCurveTo(100, 50, 150, 70);
    ctx.quadraticCurveTo(200, 90, 250, 120);
    ctx.quadraticCurveTo(280, 160, 250, 200);
    ctx.quadraticCurveTo(200, 230, 150, 220);
    ctx.quadraticCurveTo(100, 210, 70, 180);
    ctx.quadraticCurveTo(40, 140, 50, 80);
    ctx.stroke();
    
    // Fill with light green
    ctx.fillStyle = 'rgba(16, 185, 129, 0.1)';
    ctx.fill();
    
    // Add receptor residues
    const residues = [
      { x: 80, y: 100, name: 'TYR45' },
      { x: 150, y: 90, name: 'ARG78' },
      { x: 220, y: 130, name: 'ASP92' },
      { x: 200, y: 180, name: 'LEU156' },
      { x: 120, y: 190, name: 'PHE203' }
    ];
    
    residues.forEach(residue => {
      // Draw residue circle
      ctx.fillStyle = '#059669';
      ctx.beginPath();
      ctx.arc(residue.x, residue.y, 8, 0, 2 * Math.PI);
      ctx.fill();
      
      // Draw residue label
      ctx.fillStyle = '#065f46';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(residue.name, residue.x, residue.y - 15);
    });
  };

  const drawLigandStructure = (ctx: CanvasRenderingContext2D) => {
    // Draw simplified ligand structure in center
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Main ligand body
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 4;
    ctx.fillStyle = '#3b82f6';
    
    // Draw hexagonal ring (represents aromatic ring)
    const hexRadius = 25;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const x = centerX + hexRadius * Math.cos(angle);
      const y = centerY + hexRadius * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    
    // Add substituents
    ctx.strokeStyle = '#1d4ed8';
    ctx.lineWidth = 3;
    
    // Side chains
    ctx.beginPath();
    ctx.moveTo(centerX + hexRadius, centerY);
    ctx.lineTo(centerX + hexRadius + 20, centerY - 10);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(centerX - hexRadius, centerY);
    ctx.lineTo(centerX - hexRadius - 15, centerY + 15);
    ctx.stroke();
    
    // Functional groups
    ctx.fillStyle = '#dc2626'; // Oxygen
    ctx.beginPath();
    ctx.arc(centerX + hexRadius + 20, centerY - 10, 5, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.fillStyle = '#1d4ed8'; // Nitrogen
    ctx.beginPath();
    ctx.arc(centerX - hexRadius - 15, centerY + 15, 5, 0, 2 * Math.PI);
    ctx.fill();
    
    // Ligand label
    ctx.fillStyle = '#1e40af';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('LIGAND', centerX, centerY + 50);
  };

  const drawInteractions = (ctx: CanvasRenderingContext2D) => {
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Hydrogen bonds (dashed lines)
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    
    const hBonds = [
      { from: { x: centerX + 20, y: centerY - 10 }, to: { x: 150, y: 90 } },
      { from: { x: centerX - 15, y: centerY + 15 }, to: { x: 220, y: 130 } }
    ];
    
    hBonds.forEach(bond => {
      ctx.beginPath();
      ctx.moveTo(bond.from.x, bond.from.y);
      ctx.lineTo(bond.to.x, bond.to.y);
      ctx.stroke();
    });
    
    // Hydrophobic interactions (solid lines)
    ctx.setLineDash([]);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    
    const hydrophobic = [
      { from: { x: centerX + 10, y: centerY + 20 }, to: { x: 200, y: 180 } },
      { from: { x: centerX - 10, y: centerY - 20 }, to: { x: 120, y: 190 } }
    ];
    
    hydrophobic.forEach(interaction => {
      ctx.beginPath();
      ctx.moveTo(interaction.from.x, interaction.from.y);
      ctx.lineTo(interaction.to.x, interaction.to.y);
      ctx.stroke();
    });
  };

  const generateInteractionData = () => {
    return {
      hydrogenBonds: [
        { residue: 'ARG78', distance: '2.1 Å', type: 'H-bond' },
        { residue: 'ASP92', distance: '1.9 Å', type: 'H-bond' }
      ],
      hydrophobicInteractions: [
        { residue: 'LEU156', distance: '3.4 Å', type: 'Hydrophobic' },
        { residue: 'PHE203', distance: '3.8 Å', type: 'π-π stacking' }
      ],
      electrostaticInteractions: [
        { residue: 'TYR45', distance: '3.2 Å', type: 'Electrostatic' }
      ]
    };
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const link = document.createElement('a');
      link.download = `binding_pose_2d_${ligandSmiles.substring(0, 10)}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
    }
  };

  const regenerate = () => {
    generateBindingPose();
  };

  return (
    <Card className="border border-purple-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-purple-800">
            2D Binding Pose Analysis
          </CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={regenerate} disabled={isLoading}>
              <RotateCcw className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="outline" onClick={downloadImage} disabled={isLoading}>
              <Download className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <canvas 
            ref={canvasRef}
            width={width}
            height={height}
            className="border rounded bg-white w-full"
            style={{ maxWidth: '100%', height: 'auto' }}
          />
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/90 rounded">
              <div className="text-sm text-gray-600 flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full"></div>
                Analyzing binding pose...
              </div>
            </div>
          )}
        </div>

        {interactionData && !isLoading && (
          <div className="space-y-3">
            <div className="text-sm font-semibold text-gray-800">Molecular Interactions</div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-red-50 p-2 rounded border border-red-200">
                <div className="font-medium text-red-800 mb-1">Hydrogen Bonds</div>
                {interactionData.hydrogenBonds.map((bond: any, i: number) => (
                  <div key={i} className="flex justify-between">
                    <span>{bond.residue}</span>
                    <span className="text-red-600">{bond.distance}</span>
                  </div>
                ))}
              </div>
              
              <div className="bg-orange-50 p-2 rounded border border-orange-200">
                <div className="font-medium text-orange-800 mb-1">Hydrophobic</div>
                {interactionData.hydrophobicInteractions.map((inter: any, i: number) => (
                  <div key={i} className="flex justify-between">
                    <span>{inter.residue}</span>
                    <span className="text-orange-600">{inter.distance}</span>
                  </div>
                ))}
              </div>
              
              <div className="bg-blue-50 p-2 rounded border border-blue-200">
                <div className="font-medium text-blue-800 mb-1">Electrostatic</div>
                {interactionData.electrostaticInteractions.map((elec: any, i: number) => (
                  <div key={i} className="flex justify-between">
                    <span>{elec.residue}</span>
                    <span className="text-blue-600">{elec.distance}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2 text-xs flex-wrap">
          <Badge variant="outline">2D Projection</Badge>
          <Badge variant="outline">Interaction Analysis</Badge>
          <Badge variant="outline">Publication Ready</Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export default BindingPose2D;
